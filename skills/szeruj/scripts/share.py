#!/usr/bin/env python3
"""Publish Markdown, HTML, or ZIP documents to Szeruj."""

from __future__ import annotations

import argparse
import json
import mimetypes
import os
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any


DEFAULT_BASE_URL = "http://szeruj.local:8369"
ALLOWED_EXTENSIONS = {".md", ".markdown", ".html", ".htm", ".zip"}
CONTENT_TYPES = {
    ".md": "text/markdown; charset=utf-8",
    ".markdown": "text/markdown; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".zip": "application/zip",
}


class ShareError(RuntimeError):
    """A safe, user-facing publication failure."""


def parse_env_file(path: Path) -> dict[str, str]:
    if not path.is_file():
        return {}

    values: dict[str, str] = {}
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as error:
        raise ShareError(f"Nie można odczytać konfiguracji {path}: {error}") from error

    for line_number, raw_line in enumerate(lines, start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        if "=" not in line:
            raise ShareError(
                f"Nieprawidłowy wpis w {path}, linia {line_number}: oczekiwano KLUCZ=WARTOŚĆ."
            )
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


def is_szeruj_project(directory: Path) -> bool:
    package_file = directory / "package.json"
    if not package_file.is_file():
        return False
    try:
        package = json.loads(package_file.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return False
    return isinstance(package, dict) and package.get("name") == "szeruj"


def project_config_paths() -> list[Path]:
    current = Path.cwd().resolve()
    for directory in (current, *current.parents):
        if is_szeruj_project(directory):
            return [directory / ".env", directory / ".env.local"]
    return []


def default_config_paths() -> list[Path]:
    config_home = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config"))
    return [config_home / "szeruj" / "config.env", *project_config_paths()]


def load_configuration(explicit_path: Path | None) -> dict[str, str]:
    if explicit_path is not None:
        if not explicit_path.is_file():
            raise ShareError(f"Nie znaleziono pliku konfiguracji: {explicit_path}")
        return parse_env_file(explicit_path)

    merged: dict[str, str] = {}
    # Earlier paths have priority, so only fill values that are still absent.
    for path in default_config_paths():
        for key, value in parse_env_file(path).items():
            merged.setdefault(key, value)
    return merged


def resolve_base_url(cli_value: str | None, config: dict[str, str]) -> str:
    value = (
        cli_value
        or os.environ.get("SZERUJ_BASE_URL")
        or os.environ.get("SZERUJ_PUBLIC_URL")
        or config.get("SZERUJ_BASE_URL")
        or config.get("SZERUJ_PUBLIC_URL")
        or DEFAULT_BASE_URL
    )
    base_url = value.strip().rstrip("/")
    parsed = urllib.parse.urlparse(base_url)
    try:
        parsed_port = parsed.port
    except ValueError as error:
        raise ShareError("Bazowy URL zawiera nieprawidłowy port.") from error
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ShareError("Bazowy URL musi być pełnym adresem http:// albo https://.")
    if parsed.username or parsed.password:
        raise ShareError("Bazowy URL nie może zawierać danych logowania.")
    if parsed.path not in {"", "/"} or parsed.params or parsed.query or parsed.fragment:
        raise ShareError("Bazowy URL nie może zawierać ścieżki, parametrów ani fragmentu.")
    if parsed_port is not None and not 1 <= parsed_port <= 65535:
        raise ShareError("Bazowy URL zawiera nieprawidłowy port.")
    return base_url


def resolve_token(config: dict[str, str]) -> str:
    token = (
        os.environ.get("SZERUJ_API_TOKEN")
        or config.get("SZERUJ_API_TOKEN")
        or os.environ.get("API_TOKEN")
        or config.get("API_TOKEN")
        or ""
    ).strip()
    if not token:
        raise ShareError(
            "Brakuje tokenu API. Ustaw SZERUJ_API_TOKEN albo skonfiguruj API_TOKEN w pliku env."
        )
    return token


def request_json(request: urllib.request.Request, timeout: float) -> tuple[int, dict[str, Any]]:
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            status = response.status
            raw_body = response.read()
    except urllib.error.HTTPError as error:
        raw_body = error.read()
        try:
            payload = json.loads(raw_body.decode("utf-8"))
            detail = payload.get("error") if isinstance(payload, dict) else None
        except (UnicodeDecodeError, json.JSONDecodeError):
            detail = None
        raise ShareError(f"API zwróciło HTTP {error.code}: {detail or error.reason}") from error
    except urllib.error.URLError as error:
        reason = getattr(error, "reason", error)
        raise ShareError(f"Nie można połączyć się z Szeruj: {reason}") from error
    except TimeoutError as error:
        raise ShareError(
            "Przekroczono czas oczekiwania. Nie ponawiaj publikacji bez sprawdzenia, czy dokument powstał."
        ) from error

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ShareError("API zwróciło odpowiedź, która nie jest poprawnym JSON-em.") from error
    if not isinstance(payload, dict):
        raise ShareError("API zwróciło nieoczekiwany format odpowiedzi.")
    return status, payload


def multipart_payload(path: Path, title: str | None) -> tuple[bytes, str]:
    extension = path.suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        supported = ", ".join(sorted(ALLOWED_EXTENSIONS))
        raise ShareError(f"Nieobsługiwane rozszerzenie {extension or '(brak)'}. Dozwolone: {supported}.")
    if not path.is_file():
        raise ShareError(f"Nie znaleziono pliku: {path}")

    try:
        file_bytes = path.read_bytes()
    except OSError as error:
        raise ShareError(f"Nie można odczytać pliku {path}: {error}") from error

    boundary = f"----szeruj-{secrets.token_hex(16)}"
    chunks: list[bytes] = []

    def add_text(name: str, value: str) -> None:
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode(),
                value.encode("utf-8"),
                b"\r\n",
            ]
        )

    if title:
        add_text("title", title)

    filename = path.name.replace('"', "_").replace("\r", "_").replace("\n", "_")
    content_type = CONTENT_TYPES.get(extension) or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode(),
            f"Content-Type: {content_type}\r\n\r\n".encode(),
            file_bytes,
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def json_payload(document_type: str | None, title: str | None) -> tuple[bytes, str]:
    if document_type not in {"markdown", "html"}:
        raise ShareError("Przy --stdin podaj --type markdown albo --type html.")
    try:
        content = sys.stdin.read()
    except OSError as error:
        raise ShareError(f"Nie można odczytać standardowego wejścia: {error}") from error
    if not content:
        raise ShareError("Standardowe wejście jest puste.")
    payload = {
        "type": document_type,
        "title": title or "Udostępniony dokument",
        "content": content,
    }
    return json.dumps(payload, ensure_ascii=False).encode("utf-8"), "application/json; charset=utf-8"


def verify_url(url: str, timeout: float) -> tuple[bool, int | None, str | None]:
    request = urllib.request.Request(
        url,
        headers={"Accept": "text/html,*/*;q=0.8", "User-Agent": "szeruj-skill/1.1"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return 200 <= response.status < 400, response.status, None
    except urllib.error.HTTPError as error:
        return False, error.code, str(error.reason)
    except (urllib.error.URLError, TimeoutError) as error:
        return False, None, str(getattr(error, "reason", error))


def check_server(base_url: str, timeout: float, output_json: bool) -> int:
    ok, status, error = verify_url(f"{base_url}/api/health", timeout)
    result = {"ok": ok, "base_url": base_url, "status": status, "error": error}
    if output_json:
        print(json.dumps(result, ensure_ascii=False))
    elif ok:
        print(f"Szeruj działa: {base_url}")
    else:
        print(f"Szeruj nie odpowiada: {error or f'HTTP {status}'}", file=sys.stderr)
    return 0 if ok else 1


def publish(args: argparse.Namespace, config: dict[str, str], base_url: str) -> int:
    token = resolve_token(config)
    if args.file:
        body, content_type = multipart_payload(args.file.resolve(), args.title)
    else:
        body, content_type = json_payload(args.document_type, args.title)

    request = urllib.request.Request(
        f"{base_url}/api/v1/documents",
        data=body,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
            "User-Agent": "szeruj-skill/1.1",
        },
        method="POST",
    )
    status, payload = request_json(request, args.timeout)
    if status != 201:
        raise ShareError(f"API zwróciło nieoczekiwany status HTTP {status}.")

    document = payload.get("document")
    if not isinstance(document, dict):
        raise ShareError("W odpowiedzi API brakuje obiektu document.")
    url = document.get("url")
    if not isinstance(url, str) or not url.startswith(("http://", "https://")):
        raise ShareError("W odpowiedzi API brakuje poprawnego publicznego URL-u.")

    verified = None
    verify_status = None
    verify_error = None
    if not args.no_verify:
        verified, verify_status, verify_error = verify_url(url, min(args.timeout, 15.0))

    if args.output_json:
        print(
            json.dumps(
                {
                    "ok": True,
                    "url": url,
                    "verified": verified,
                    "verify_status": verify_status,
                    "verify_error": verify_error,
                    "document": document,
                },
                ensure_ascii=False,
            )
        )
    else:
        print(f"Hej, tutaj wrzuciłem {url}")
        if verified is False:
            print(
                "Uwaga: publikacja powiodła się, ale kontrolne otwarcie linku nie zostało "
                f"potwierdzone ({verify_error or f'HTTP {verify_status}'}).",
                file=sys.stderr,
            )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Publikuj Markdown, HTML lub ZIP w aplikacji Szeruj."
    )
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--file", type=Path, help="Plik .md, .html albo .zip do publikacji.")
    source.add_argument("--stdin", action="store_true", help="Odczytaj Markdown lub HTML ze stdin.")
    parser.add_argument("--type", dest="document_type", choices=("markdown", "html"))
    parser.add_argument("--title", help="Tytuł widoczny w Szeruj.")
    parser.add_argument("--base-url", help=f"Bazowy URL (domyślnie {DEFAULT_BASE_URL}).")
    parser.add_argument("--env-file", type=Path, help="Plik env z tokenem i opcjonalnym URL-em.")
    parser.add_argument("--timeout", type=float, default=60.0, help="Timeout żądania w sekundach.")
    parser.add_argument("--no-verify", action="store_true", help="Nie otwieraj kontrolnie publicznego URL-u.")
    parser.add_argument("--json", dest="output_json", action="store_true", help="Wypisz wynik jako JSON.")
    parser.add_argument("--check", action="store_true", help="Sprawdź serwer bez publikowania.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout musi być większy od zera")
    if args.check and (args.file or args.stdin):
        parser.error("--check nie może być łączone z --file ani --stdin")
    if not args.check and not (args.file or args.stdin):
        parser.error("podaj --file albo --stdin")
    if args.file and args.document_type:
        parser.error("--type jest używane tylko z --stdin")

    try:
        config = load_configuration(args.env_file)
        base_url = resolve_base_url(args.base_url, config)
        if args.check:
            return check_server(base_url, args.timeout, args.output_json)
        return publish(args, config, base_url)
    except ShareError as error:
        if args.output_json:
            print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False))
        else:
            print(f"szeruj: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
