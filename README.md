# szeruj

[![CI](https://github.com/marcin-kruszynski/szeruj/actions/workflows/ci.yml/badge.svg)](https://github.com/marcin-kruszynski/szeruj/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/licencja-MIT-164e42.svg)](LICENSE)

> Wrzuć. Otwórz. Szeruj.

Masz raport od agenta, ładny Markdown albo małą stronę z wykresem i chcesz po
prostu wysłać komuś link? Szeruj robi właśnie to — bez stawiania osobnego
frontendu dla każdego dokumentu i bez ceremonii.

![Szeruj — Markdown, HTML i paczki ZIP pod jednym linkiem](public/og.png)

## Co dostajesz

- dziesięć dopracowanych i zapamiętywanych motywów: pięć jasnych i pięć ciemnych,
- GitHub Flavored Markdown z tabelami, checklistami, listami i kolorowaniem kodu,
- przycisk kopiowania przy każdym bloku kodu,
- samodzielny HTML oraz paczki ZIP z CSS-em, JavaScriptem, grafikami i fontami,
- pobieranie źródłowego Markdownu, HTML-u albo kompletnej paczki ZIP,
- trudne do odgadnięcia publiczne linki (22 znaki, 132 bity losowości),
- panel admina do tworzenia, wyszukiwania, edycji Markdownu i usuwania,
- proste API Bearer dla agentów,
- gotowy globalny skill Codex wywoływany słowami „Hej, szeruj”,
- lekki kontener: jeden serwer Node, SQLite i zwykły katalog z plikami.

Jasne motywy to Papier, Poranek, Laguna, Łąka i Lawenda. Ciemne: Noc, Głębia,
Bór, Wino i Grafit. Wybór jest zapamiętywany lokalnie w przeglądarce i działa
na stronie głównej, dokumentach oraz w panelu admina.

UI, API i magazyn dokumentów są jedną aplikacją. Do działania nie potrzebujesz
żadnej zewnętrznej bazy ani dodatkowej usługi.

## Start w kilka minut

Potrzebujesz Dockera z Compose oraz Node.js 22 lub nowszego tylko do
wygenerowania konfiguracji.

```bash
git clone https://github.com/marcin-kruszynski/szeruj.git
cd szeruj
npm run setup
docker compose up -d --build
docker compose ps
```

`npm run setup` tworzy prywatny `.env`, losuje mocne hasło i tokeny oraz zakłada
katalog `data`. Nie nadpisze istniejącej konfiguracji bez wyraźnego `--force`.

Domyślny adres to `http://szeruj.local:8369`. Nazwa `.local` musi rozwiązywać
się w Twojej sieci (mDNS, lokalny DNS albo wpis w pliku hosts). Możesz od razu
wpisać nazwę swojego serwera lub adres IP w `.env`:

```dotenv
SZERUJ_PUBLIC_URL=http://twoj-serwer.local:8369
```

Panel administratora znajdziesz pod `/admin/login`. Login i hasło są w
lokalnym `.env`; plik jest ignorowany przez Git i nie trafia do obrazu.

Nie masz Node.js na serwerze? Skopiuj `.env.example` do `.env`, wpisz własne
długie losowe sekrety i utwórz katalog `data` przed uruchomieniem Compose.

## Konfiguracja serwera

Wszystko, co zależy od instalacji, mieszka w `.env`:

| Zmienna | Domyślnie | Do czego służy |
| --- | --- | --- |
| `SZERUJ_PUBLIC_URL` | `http://szeruj.local:8369` | Kanoniczny adres używany w linkach i metadanych |
| `SZERUJ_BIND_ADDRESS` | `0.0.0.0` | Interfejs, na którym Docker publikuje usługę |
| `SZERUJ_PORT` | `8369` | Port na hoście |
| `SZERUJ_DATA_PATH` | `./data` | Katalog bazy SQLite i plików |
| `SZERUJ_MEMORY_LIMIT` | `2g` | Limit pamięci kontenera, potrzebny przy dużych ZIP-ach |
| `SZERUJ_UID` / `SZERUJ_GID` | `1000` | Właściciel danych na hoście |
| `SZERUJ_IMAGE` | `szeruj:local` | Nazwa lokalnego obrazu |
| `SZERUJ_CONTAINER_NAME` | `szeruj` | Nazwa kontenera |
| `ADMIN_USERNAME` | `admin` | Login administratora |
| `ADMIN_PASSWORD` | generowane | Hasło administratora, minimum 16 znaków |
| `ADMIN_SESSION_SECRET` | generowane | Sekret podpisu sesji, minimum 32 znaki |
| `API_TOKEN` | generowane | Token publikacji dla agentów, minimum 32 znaki |

Port wewnątrz kontenera pozostaje stały (`3000`). Zmiana portu na hoście to
jedna linia w `.env`, bez ruszania obrazu czy healthchecka.

Po zmianie konfiguracji odtwórz usługę:

```bash
docker compose up -d --build --force-recreate
```

## Skill „Hej, szeruj” w każdym projekcie

Skill instaluje się **raz dla danego konta systemowego**. Później widzi go każdy
nowy agent Codex, niezależnie od katalogu projektu. Jeśli na maszynie pracuje
kilku użytkowników systemowych, każdy instaluje i konfiguruje skill na swoim
koncie.

Cały przepływ ma trzy krótkie kroki: instalacja skilla, skopiowanie tokenu z
serwera i jednorazowa konfiguracja na maszynie agenta.

### 1. Zainstaluj skill globalnie

Najłatwiej powiedzieć agentowi Codex:

```text
Zainstaluj skill z https://github.com/marcin-kruszynski/szeruj/tree/main/skills/szeruj
```

Możesz też uruchomić instalator samodzielnie.

Linux i macOS:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
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

Jeśli używasz własnego `CODEX_HOME`, w poleceniach linuksowych i macOS zamień
`~/.codex` na jego wartość. Po pierwszej instalacji uruchom ponownie Codex, aby
nowy skill został wykryty.

### 2. Weź token z serwera

Na maszynie, na której działa Szeruj, w katalogu repozytorium uruchom:

```bash
npm run token --silent
```

To wypisze wartość `API_TOKEN` z serwerowego `.env`. Skopiuj ją, ale nie
wysyłaj w czacie i nie zapisuj w repozytorium. Agent potrzebuje tylko tego
jednego tokenu — nie potrzebuje hasła administratora ani sekretu sesji.

### 3. Skonfiguruj klienta raz

Linux i macOS:

```bash
python3 ~/.codex/skills/szeruj/scripts/share.py \
  --configure \
  --base-url http://twoj-serwer.local:8369
```

Windows PowerShell (używa zmiennej `$codexRoot` z kroku instalacji):

```powershell
py (Join-Path $codexRoot "skills\szeruj\scripts\share.py") `
  --configure `
  --base-url http://twoj-serwer.local:8369
```

Klient poprosi o token w **ukrytym promptcie**, zapisze go poza projektami i
ustawi prywatne uprawnienia pliku tam, gdzie system je obsługuje. Token nie
trafia do historii powłoki ani do argumentów procesu.

Domyślne położenie globalnej konfiguracji:

| System | Plik |
| --- | --- |
| Linux | `~/.config/szeruj/config.env` |
| macOS | `~/Library/Application Support/szeruj/config.env` |
| Windows | `%APPDATA%\szeruj\config.env` |

`XDG_CONFIG_HOME` zmienia katalog bazowy na systemach, które go używają.
`SZERUJ_CONFIG_FILE` może wskazać całkiem własną ścieżkę.

Sprawdź połączenie bez publikowania dokumentu:

```bash
python3 ~/.codex/skills/szeruj/scripts/share.py --check
```

I tyle. Od tej chwili w dowolnym projekcie możesz powiedzieć:

```text
Hej, szeruj
```

Po publikacji agent odpowie dokładnie:

```text
Hej, tutaj wrzuciłem <link>
```

### Alternatywa: globalne zmienne środowiskowe

Klient rozpoznaje `SZERUJ_BASE_URL` i `SZERUJ_API_TOKEN`. Możesz ustawić je
globalnie zamiast używać pliku konfiguracji, ale wtedy token odziedziczy każdy
proces uruchomiony z tej sesji. Prywatny `config.env` jest zwykle bezpieczniejszy
i działa pewniej także dla aplikacji uruchamianych z pulpitu.

Linux — dodaj ręcznie do `~/.profile` albo pliku startowego swojej powłoki:

```bash
export SZERUJ_BASE_URL="http://twoj-serwer.local:8369"
export SZERUJ_API_TOKEN="wklej-token"
```

macOS — dla aplikacji uruchamianych z terminala dodaj te same linie do
`~/.zprofile` lub `~/.zshrc`. Aplikacje uruchamiane z Docka nie zawsze dziedziczą
środowisko powłoki, dlatego na macOS szczególnie polecam `--configure`.

Windows PowerShell — ustaw trwałe zmienne dla bieżącego użytkownika:

```powershell
[Environment]::SetEnvironmentVariable("SZERUJ_BASE_URL", "http://twoj-serwer.local:8369", "User")
[Environment]::SetEnvironmentVariable("SZERUJ_API_TOKEN", "wklej-token", "User")
```

Po zmianie trwałych zmiennych zamknij i uruchom ponownie terminal oraz agenta.
Jeśli wpisujesz prawdziwy token bezpośrednio w poleceniu, usuń tę pozycję z
historii PowerShell; bezpieczniej użyć ukrytego promptu `--configure`.

## API dla agentów

Publikacja odbywa się przez `POST /api/v1/documents` z nagłówkiem:

```text
Authorization: Bearer TWOJ_TOKEN_API
```

Markdown albo pojedynczy HTML można wysłać jako JSON:

```bash
curl -X POST http://szeruj.local:8369/api/v1/documents \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"markdown","title":"Raport agenta","content":"## Gotowe\n\nTreść raportu."}'
```

Plik `.md`, `.markdown`, `.html` albo `.htm` wyślesz jako formularz. ZIP-y,
zwłaszcza duże, wysyłaj jako surowe `application/zip`, aby serwer nie musiał
buforować multipart drugi raz:

```bash
curl -X POST http://szeruj.local:8369/api/v1/documents \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/zip" \
  -H "X-Szeruj-Filename: raport.zip" \
  -H "X-Szeruj-Title: Interaktywny%20raport" \
  --data-binary @./raport.zip
```

Oficjalny klient `share.py` wybiera ten wydajniejszy transport automatycznie.

Odpowiedź `201` zawiera obiekt `document` i gotowe pole `url`. Jego domena
pochodzi z `SZERUJ_PUBLIC_URL`, więc agent od razu oddaje właściwy link.

## Bezpieczeństwo — krótko i uczciwie

- Publiczny link jest nieindeksowany i bardzo trudny do odgadnięcia, ale nie
  jest dodatkowym hasłem. Każdy, kto pozna link, może otworzyć dokument.
- Markdown nie wykonuje surowego HTML-u. HTML i ZIP-y działają w odizolowanym
  `iframe` bez `allow-same-origin`, formularzy i nawigacji głównego okna.
- Tworzenie dokumentów wymaga tokenu API albo sesji administratora. Nie dawaj
  tokenu niezaufanym osobom i nie umieszczaj go w publikowanych treściach.
- Przed wystawieniem usługi do Internetu dodaj HTTPS oraz reverse proxy. Jeśli
  chcesz pozwolić anonimowym osobom na upload, potrzebujesz też limitów ruchu,
  kwot, moderacji i ochrony przed nadużyciami — ta aplikacja celowo nie udaje
  kompletnego publicznego hostingu plików.

Paczka ZIP może mieć najwyżej 100 MB, 300 MB po rozpakowaniu, 250 plików i
300 MB na pojedynczy plik. Serwer odrzuca niebezpieczne ścieżki, duplikaty oraz
ZIP-y bez wejściowego HTML-u. Limit pamięci `2g` jest górnym pułapem na czas
przetwarzania dużej paczki, a nie rezerwacją RAM-u podczas zwykłej pracy.

## Dane, backup i aktualizacja

W instalacji dockerowej wszystko, czego nie chcesz stracić, jest w `data/`:
baza `szeruj.sqlite` oraz katalog `files/`. Zatrzymaj na chwilę usługę i
zarchiwizuj ten katalog razem z prywatnym `.env`.

```bash
docker compose stop
tar -czf szeruj-backup.tgz data .env
docker compose start
```

Aktualizacja wygląda zwyczajnie:

```bash
git pull --ff-only
docker compose up -d --build
```

## Development

```bash
npm ci
npm run setup
npm run dev
```

Serwer deweloperski nasłuchuje na `0.0.0.0`; domyślnie otworzysz go pod
`http://localhost:3000`. Dane trafiają do `.szeruj-data/`.

Przed zmianą odpal pełny zestaw kontroli:

```bash
npm run lint
npm test
```

## Licencja

[MIT](LICENSE). Bierz, stawiaj u siebie i szeruj bez spiny.
