# Szeruj — instrukcja dla agentów

## 1. Uruchom aplikację w Dockerze

To jest domyślna ścieżka dla świeżo pobranego repozytorium. Najpierw postaw
działającą aplikację produkcyjną; środowisko developerskie jest opisane później.

Wymagane są Docker z Compose oraz Git. Node.js 22+ jest potrzebny na hoście
tylko do najwygodniejszego wygenerowania konfiguracji.

### Świeża instalacja

W katalogu głównym repozytorium:

1. Jeżeli nie ma pliku `.env`, utwórz go wraz z losowymi sekretami:

   ```bash
   npm run setup
   ```

   Polecenie tworzy prywatny `.env` oraz katalog `data/`. Nie uruchamiaj go z
   `--force`, jeżeli instalacja ma już konfigurację.

   Jeżeli na hoście nie ma Node.js, ale jest Docker, na Linuxie lub macOS użyj:

   ```bash
   docker run --rm --user "$(id -u):$(id -g)" \
     -v "$PWD:/app" -w /app node:26-bookworm-slim \
     node scripts/setup-env.mjs
   ```

2. Ustaw w `.env` adres, pod którym użytkownicy i agenci mają otwierać Szeruj:

   ```dotenv
   SZERUJ_PUBLIC_URL=http://nazwa-lub-ip-serwera:8369
   ```

   Jeżeli użytkownik podał domenę, IP albo inny port, zastosuj je tutaj. Jeśli
   niczego nie podał, pozostaw domyślne `http://szeruj.local:8369` i nie blokuj
   przez to uruchomienia.

3. Zbuduj i uruchom usługę:

   ```bash
   docker compose up -d --build
   ```

4. Poczekaj na zdrowy kontener i sprawdź aplikację:

   ```bash
   docker compose ps
   curl --fail http://127.0.0.1:8369/api/health
   ```

   Jeżeli `SZERUJ_PORT` ma inną wartość, użyj jej również w adresie healthchecka.
   Poprawna odpowiedź to `{"status":"ok"}`, a stan kontenera powinien zmienić
   się na `healthy`.

5. Przekaż użytkownikowi:

   - adres aplikacji z `SZERUJ_PUBLIC_URL`,
   - adres panelu: `<SZERUJ_PUBLIC_URL>/admin/login`,
   - informację, że login i hasło administratora są w lokalnym `.env`.

Nie wypisuj haseł, tokenów ani całej zawartości `.env` w odpowiedzi lub logach.

### Konfiguracja Dockera i dane

Najważniejsze ustawienia są w `.env`:

- `SZERUJ_PUBLIC_URL` — adres umieszczany w generowanych linkach,
- `SZERUJ_BIND_ADDRESS` — domyślnie `0.0.0.0`,
- `SZERUJ_PORT` — port hosta, domyślnie `8369`,
- `SZERUJ_DATA_PATH` — katalog danych, domyślnie `./data`,
- `SZERUJ_MEMORY_LIMIT` — limit RAM kontenera,
- `SZERUJ_UID` i `SZERUJ_GID` — właściciel plików danych.

Pozostałe opcje i wartości domyślne są opisane w `.env.example`.

`SZERUJ_DATA_PATH` jest bind-mountem do `/data` w kontenerze. Domyślny katalog
`data/` zawiera bazę SQLite oraz wszystkie opublikowane pliki. Trwałe elementy
instalacji to:

- `.env` — konfiguracja i sekrety,
- `data/` — baza i dokumenty.

Aktualizacja obrazu nie może usuwać tych dwóch elementów. Do spójnego backupu
zatrzymaj usługę, skopiuj `.env` i cały katalog danych, a następnie uruchom ją
ponownie.

Po zmianie `.env` albo aktualizacji kodu zastosuj konfigurację poleceniem:

```bash
docker compose up -d --build --force-recreate
```

## 2. Zainstaluj globalny skill „Szeruj”

Skill instaluje się raz dla bieżącego konta systemowego i działa później we
wszystkich projektach tego użytkownika.

### Instalacja

Jeżeli agent ma dostęp do skilla `skill-installer`, użyj go do instalacji:

```text
https://github.com/marcin-kruszynski/szeruj/tree/main/skills/szeruj
```

Odpowiednik z terminala na Linuxie i macOS:

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-installer/scripts/install-skill-from-github.py" \
  --repo marcin-kruszynski/szeruj \
  --path skills/szeruj
```

Windows PowerShell:

```powershell
$codexRoot = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE ".codex" }
py (Join-Path $codexRoot "skills\.system\skill-installer\scripts\install-skill-from-github.py") `
  --repo marcin-kruszynski/szeruj `
  --path skills/szeruj
```

### Jednorazowa konfiguracja

Na maszynie serwera token publikacji znajduje się jako `API_TOKEN` w `.env`.
Agent działający na tej samej maszynie powinien odczytać go lokalnie i podać do
ukrytego promptu konfiguratora przez stdin/PTY — bez pokazywania tokenu
użytkownikowi i bez umieszczania go w argumentach polecenia.

Linux i macOS:

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/szeruj/scripts/share.py" \
  --configure --base-url http://nazwa-lub-ip-serwera:8369
```

Windows PowerShell:

```powershell
py (Join-Path $codexRoot "skills\szeruj\scripts\share.py") `
  --configure --base-url http://nazwa-lub-ip-serwera:8369
```

Użyj rzeczywistego `SZERUJ_PUBLIC_URL`. Konfigurator zapisuje URL i token poza
repozytoriami, w prywatnej konfiguracji bieżącego użytkownika.

Na końcu sprawdź połączenie bez publikowania dokumentu:

```bash
python3 "${CODEX_HOME:-$HOME/.codex}/skills/szeruj/scripts/share.py" --check
```

Po instalacji uruchom ponownie Codex, aby nowe sesje wykryły skill. Od tej chwili
polecenie „Szeruj” ma działać z dowolnego katalogu.

## 3. Praca developerska

Dopiero gdy zadanie dotyczy rozwoju aplikacji, uruchom środowisko lokalne:

```bash
npm ci
npm run setup        # tylko gdy nie istnieje .env
npm run dev
```

Serwer developerski nasłuchuje na `0.0.0.0:3000`.

Przed oddaniem zmian uruchom:

```bash
npm run lint
npm test
npm audit
```

## 4. Mapa repozytorium

- `app/` — strony i endpointy API,
- `components/` — interfejs i renderer Markdownu,
- `lib/` — logika dokumentów, archiwów, uwierzytelnienia i URL-i,
- `db/index.ts` — SQLite i magazyn plików,
- `skills/szeruj/` — globalny skill i klient `scripts/share.py`,
- `scripts/setup-env.mjs` — generator `.env`,
- `compose.yaml` i `Dockerfile` — uruchomienie kontenerowe,
- `lib/themes.ts` — lista motywów,
- `app/globals.css` — palety i wygląd motywów,
- `README.md` — pełna dokumentacja dla człowieka.

## 5. Szybka diagnoza

```bash
docker compose ps
docker compose logs --tail=100 szeruj
curl --fail http://127.0.0.1:8369/api/health
```

Jeżeli port jest zajęty, zmień `SZERUJ_PORT` i `SZERUJ_PUBLIC_URL` w `.env`, a
następnie odtwórz kontener. Jeżeli nie działa publikowanie ze skilla, najpierw
uruchom `share.py --check`.
