#!/usr/bin/env python3
"""Publish Markdown, HTML, or ZIP documents to Szeruj."""

from __future__ import annotations

import argparse
import getpass
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
SUCCESS_MESSAGES = (
    "Wyszerowane: {url}",
    "Szernięte tu: {url}",
    "Poszło w szer: {url}",
)


class ShareError(RuntimeError):
    """A safe, user-facing publication failure."""


def success_message(url: str) -> str:
    """Return one short, branded success line while preserving the exact URL."""

    return secrets.choice(SUCCESS_MESSAGES).format(url=url)


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
            return [directory / ".env"]
    return []


def global_config_path() -> Path:
    explicit = os.environ.get("SZERUJ_CONFIG_FILE", "").strip()
    if explicit:
        return Path(explicit).expanduser()

    xdg_home = os.environ.get("XDG_CONFIG_HOME", "").strip()
    if xdg_home:
        return Path(xdg_home).expanduser() / "szeruj" / "config.env"

    if sys.platform == "win32":
        appdata = os.environ.get("APPDATA", "").strip()
        root = Path(appdata).expanduser() if appdata else Path.home() / "AppData" / "Roaming"
        return root / "szeruj" / "config.env"

    if sys.platform == "darwin":
        return Path.home() / "Library" / "Application Support" / "szeruj" / "config.env"

    return Path.home() / ".config" / "szeruj" / "config.env"


def default_config_paths() -> list[Path]:
    return [global_config_path(), *project_config_paths()]


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
            "Brakuje tokenu API. Uruchom ten klient z opcjami "
            f"--configure --base-url {DEFAULT_BASE_URL} i wklej token w ukrytym promptcie."
        )
    return token


def configure_client(
    target: Path,
    base_url: str,
    force: bool,
    timeout: float,
    output_json: bool,
) -> int:
    target = target.expanduser()
    if target.is_symlink():
        raise ShareError(f"Plik konfiguracji nie może być dowiązaniem symbolicznym: {target}")
    target = target.resolve()
    if target.exists() and not force:
        raise ShareError(
            f"Konfiguracja już istnieje: {target}. Użyj --force, aby ją zastąpić."
        )

    token = getpass.getpass("Wklej API_TOKEN z pliku .env serwera (wartość będzie ukryta): ").strip()
    if len(token) < 32:
        raise ShareError("Token musi mieć co najmniej 32 znaki.")
    if any(character.isspace() for character in token):
        raise ShareError("Token nie może zawierać białych znaków.")

    try:
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        try:
            target.parent.chmod(0o700)
        except OSError:
            pass
        flags = os.O_WRONLY | os.O_CREAT | (os.O_TRUNC if force else os.O_EXCL)
        flags |= getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(target, flags, 0o600)
        try:
            os.chmod(target, 0o600)
        except OSError:
            pass
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as config_file:
            config_file.write(
                "# Global Szeruj client configuration. Keep this file private.\n"
                f"SZERUJ_BASE_URL={base_url}\n"
                f"SZERUJ_API_TOKEN={token}\n"
            )
    except OSError as error:
        raise ShareError(f"Nie można zapisać konfiguracji {target}: {error}") from error

    reachable, status, error = verify_url(f"{base_url}/api/health", timeout)
    result = {
        "ok": True,
        "config_file": str(target),
        "base_url": base_url,
        "server_reachable": reachable,
        "status": status,
        "error": error,
    }
    if output_json:
        print(json.dumps(result, ensure_ascii=False))
    else:
        print(f"Gotowe. Globalna konfiguracja Szeruj jest w: {target}")
        if reachable:
            print(f"Serwer odpowiada: {base_url}")
        else:
            print(
                "Konfiguracja została zapisana, ale serwer teraz nie odpowiada: "
                f"{error or f'HTTP {status}'}. Sprawdź później przez --check.",
                file=sys.stderr,
            )
    return 0


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


def raw_zip_payload(path: Path, title: str | None) -> tuple[bytes, str, dict[str, str]]:
    if path.suffix.lower() != ".zip":
        raise ShareError("Surowy upload jest obsługiwany wyłącznie dla plików .zip.")
    if not path.is_file():
        raise ShareError(f"Nie znaleziono pliku: {path}")
    try:
        file_bytes = path.read_bytes()
    except OSError as error:
        raise ShareError(f"Nie można odczytać pliku {path}: {error}") from error

    headers = {"X-Szeruj-Filename": urllib.parse.quote(path.name, safe="")}
    if title:
        headers["X-Szeruj-Title"] = urllib.parse.quote(title, safe="")
    return file_bytes, "application/zip", headers


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
        headers={"Accept": "text/html,*/*;q=0.8", "User-Agent": "szeruj-skill/1.3"},
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
    extra_headers: dict[str, str] = {}
    if args.file:
        path = args.file.resolve()
        if path.suffix.lower() == ".zip":
            body, content_type, extra_headers = raw_zip_payload(path, args.title)
        else:
            body, content_type = multipart_payload(path, args.title)
    else:
        body, content_type = json_payload(args.document_type, args.title)

    request = urllib.request.Request(
        f"{base_url}/api/v1/documents",
        data=body,
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {token}",
            "Content-Type": content_type,
            "User-Agent": "szeruj-skill/1.3",
            **extra_headers,
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
        print(success_message(url))
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
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument("--file", type=Path, help="Plik .md, .html albo .zip do publikacji.")
    source.add_argument("--stdin", action="store_true", help="Odczytaj Markdown lub HTML ze stdin.")
    source.add_argument("--check", action="store_true", help="Sprawdź serwer bez publikowania.")
    source.add_argument(
        "--configure",
        action="store_true",
        help="Zapisz globalnie URL i token (token jest odczytywany w ukrytym promptcie).",
    )
    parser.add_argument("--type", dest="document_type", choices=("markdown", "html"))
    parser.add_argument("--title", help="Tytuł widoczny w Szeruj.")
    parser.add_argument("--base-url", help=f"Bazowy URL (domyślnie {DEFAULT_BASE_URL}).")
    parser.add_argument(
        "--config-file",
        type=Path,
        help="Jawny plik konfiguracji; z --configure wybiera miejsce zapisu.",
    )
    parser.add_argument("--force", action="store_true", help="Zastąp istniejącą konfigurację.")
    parser.add_argument(
        "--timeout",
        type=float,
        default=300.0,
        help="Timeout żądania w sekundach (domyślnie 300 dla dużych ZIP-ów).",
    )
    parser.add_argument("--no-verify", action="store_true", help="Nie otwieraj kontrolnie publicznego URL-u.")
    parser.add_argument("--json", dest="output_json", action="store_true", help="Wypisz wynik jako JSON.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error("--timeout musi być większy od zera")
    if args.file and args.document_type:
        parser.error("--type jest używane tylko z --stdin")
    if args.force and not args.configure:
        parser.error("--force jest używane tylko z --configure")
    if (args.check or args.configure) and (args.document_type or args.title):
        parser.error("--type i --title są używane tylko przy publikacji")
    if (args.check or args.configure) and args.no_verify:
        parser.error("--no-verify jest używane tylko przy publikacji")

    try:
        config = load_configuration(args.config_file) if not args.configure else {}
        base_url = resolve_base_url(args.base_url, config)
        if args.configure:
            return configure_client(
                args.config_file or global_config_path(),
                base_url,
                args.force,
                min(args.timeout, 15.0),
                args.output_json,
            )
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
