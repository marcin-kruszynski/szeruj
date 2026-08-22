# API Szeruj

## Publikacja i uwierzytelnienie

- Bazowy URL konfiguruje `SZERUJ_BASE_URL` albo `SZERUJ_PUBLIC_URL`.
- Publikacja: `POST /api/v1/documents`.
- Nagłówek: `Authorization: Bearer <token>`.
- Sukces: HTTP `201`.
- Lekki test dostępności: `GET /api/health`.

Token daje prawo tworzenia dokumentów. Nie umieszczaj go w publikowanej treści,
logach, czacie ani argumentach procesu. Używaj klienta `share.py`, który czyta
sekret ze środowiska albo z prywatnego globalnego pliku konfiguracyjnego.

## JSON

Używaj dla Markdownu albo pojedynczego HTML-u:

```json
{
  "type": "markdown",
  "title": "Tytuł dokumentu",
  "content": "## Treść\n\nGotowe."
}
```

`type` przyjmuje `markdown` albo `html`. Treść musi być UTF-8 i mieć najwyżej
5 MB.

## Upload pliku

Użyj multipart z polem `file` dla `.md`, `.markdown`, `.html` albo `.htm`.
Opcjonalne pole `title` nadpisuje tytuł wyprowadzony z nazwy pliku.

ZIP wysyłaj wydajniejszym surowym transportem:

- `Content-Type: application/zip`,
- ciało żądania: dokładne bajty archiwum,
- `X-Szeruj-Filename`: nazwa pliku zakodowana przez percent-encoding,
- opcjonalny `X-Szeruj-Title`: tytuł zakodowany przez percent-encoding.

Klient `share.py` wybiera ten transport automatycznie. Multipart dla ZIP-a
pozostaje obsługiwany dla zgodności ze starszymi klientami.

Limity ZIP-a:

- 100 MB archiwum,
- 300 MB po rozpakowaniu,
- 250 plików,
- 300 MB na pojedynczy rozpakowany plik,
- co najmniej jeden `.html` albo `.htm`.

Serwer odrzuca ścieżki bezwzględne, `..`, backslashe, puste segmenty, duplikaty
i nieobsługiwane metody kompresji. Preferowanym wejściem jest główny
`index.html`.

## Odpowiedź

```json
{
  "document": {
    "id": "losowy-identyfikator",
    "title": "Tytuł dokumentu",
    "kind": "markdown",
    "url": "http://szeruj.local:8369/s/losowy-identyfikator"
  }
}
```

Za sukces uznawaj wyłącznie niepusty URL z odpowiedzi `201`.

## Typowe statusy

- `400`: błędny dokument, tytuł, kodowanie albo ZIP,
- `401`: brak lub błędny token,
- `413`: przekroczony limit,
- `415`: zły `Content-Type`,
- `500`: błąd magazynu lub serwera.

Nie ponawiaj automatycznie żądań po timeoutcie. Serwer nie przyjmuje klucza
idempotencji, więc wcześniejsze żądanie mogło już utworzyć dokument.

## Kolejność konfiguracji klienta

Bazowy URL:

1. `--base-url`,
2. `SZERUJ_BASE_URL` w środowisku,
3. `SZERUJ_PUBLIC_URL` w środowisku,
4. odpowiednie klucze z konfiguracji,
5. `http://szeruj.local:8369`.

Token:

1. `SZERUJ_API_TOKEN` w środowisku,
2. `SZERUJ_API_TOKEN` w konfiguracji,
3. `API_TOKEN` w środowisku,
4. `API_TOKEN` w konfiguracji.

Bez `--config-file` klient sprawdza globalny plik użytkownika:

- Linux: `~/.config/szeruj/config.env`,
- macOS: `~/Library/Application Support/szeruj/config.env`,
- Windows: `%APPDATA%\szeruj\config.env`.

`XDG_CONFIG_HOME` i `SZERUJ_CONFIG_FILE` mogą zmienić lokalizację. Podczas pracy
w repozytorium samego Szeruj klient potrafi też odczytać jego `.env`, ale nie
należy kopiować serwerowego `.env` do innych projektów.

Zalecana jednorazowa konfiguracja:

```bash
python3 <katalog-skilla>/scripts/share.py \
  --configure --base-url http://adres-serwera:8369
```

Token jest wprowadzany w ukrytym promptcie. Istniejący plik można świadomie
zastąpić przez `--force`.
