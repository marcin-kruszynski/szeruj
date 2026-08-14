# szeruj

[![CI](https://github.com/marcin-kruszynski/szeruj/actions/workflows/ci.yml/badge.svg)](https://github.com/marcin-kruszynski/szeruj/actions/workflows/ci.yml)
[![MIT](https://img.shields.io/badge/licencja-MIT-164e42.svg)](LICENSE)

> Wrzuć. Otwórz. Szeruj.

Masz raport od agenta, ładny Markdown albo małą stronę z wykresem i chcesz po
prostu wysłać komuś link? Szeruj robi właśnie to — bez budowania osobnego
frontendu dla każdego dokumentu i bez ceremonii.

![Szeruj — Markdown, HTML i paczki ZIP pod jednym linkiem](public/og.png)

## Co dostajesz

- pięć dopracowanych motywów: Papier, Noc, Ocean, Las i Śliwka,
- GitHub Flavored Markdown z tabelami, checklistami, listami i kolorowaniem kodu,
- przycisk kopiowania przy każdym bloku kodu,
- samodzielny HTML oraz paczki ZIP z CSS-em, JavaScriptem, grafikami i fontami,
- trudne do odgadnięcia publiczne linki (22 znaki, 132 bity losowości),
- panel admina do tworzenia, wyszukiwania, edycji Markdownu i usuwania,
- proste API Bearer dla agentów,
- gotowy skill Codex wywoływany słowami „Hej, szeruj”,
- lekki kontener: Node/Vinext + SQLite + zwykły filesystem.

To jest jedna aplikacja, nie zestaw mikroserwisów. UI, API i magazyn dokumentów
jadą razem, więc wdrożenie oraz backup są zwyczajnie proste.

## Start w kilka minut

Potrzebujesz Dockera z Compose oraz Node.js 22 tylko do wygenerowania
konfiguracji.

```bash
git clone https://github.com/marcin-kruszynski/szeruj.git
cd szeruj
npm run setup
docker compose up -d --build
docker compose ps
```

Skrypt `npm run setup` tworzy prywatny `.env`, losuje mocne hasło i tokeny oraz
zakłada katalog `data`. Nie nadpisze istniejącej konfiguracji bez wyraźnego
`--force`.

Domyślny adres to `http://szeruj.local:8369`. Nazwa `.local` musi rozwiązywać
się w Twojej sieci (mDNS, lokalny DNS albo wpis w pliku hosts). Jeśli wolisz
od razu używać hosta lub IP, zmień przed startem:

```dotenv
SZERUJ_PUBLIC_URL=http://twoj-serwer.local:8369
```

Panel administratora znajdziesz pod `/admin/login`. Dane logowania są w Twoim
lokalnym `.env` — ten plik jest ignorowany przez Git i nie trafia do obrazu.

Nie masz Node.js na serwerze? Skopiuj `.env.example` do `.env`, wpisz własne
długie losowe sekrety i utwórz katalog `data` przed uruchomieniem Compose.

## Konfiguracja

Wszystko, co zależy od instalacji, mieszka w `.env`:

| Zmienna | Domyślnie | Do czego służy |
| --- | --- | --- |
| `SZERUJ_PUBLIC_URL` | `http://szeruj.local:8369` | Kanoniczny adres używany w linkach i metadanych |
| `SZERUJ_BIND_ADDRESS` | `0.0.0.0` | Interfejs, na którym Docker publikuje usługę |
| `SZERUJ_PORT` | `8369` | Port na hoście |
| `SZERUJ_DATA_PATH` | `./data` | Katalog bazy SQLite i plików |
| `SZERUJ_MEMORY_LIMIT` | `384m` | Limit pamięci kontenera |
| `SZERUJ_UID` / `SZERUJ_GID` | `1000` | Właściciel danych na hoście |
| `SZERUJ_IMAGE` | `szeruj:local` | Nazwa lokalnego obrazu |
| `SZERUJ_CONTAINER_NAME` | `szeruj` | Nazwa kontenera |
| `ADMIN_USERNAME` | `admin` | Login administratora |
| `ADMIN_PASSWORD` | generowane | Hasło administratora, minimum 16 znaków |
| `ADMIN_SESSION_SECRET` | generowane | Sekret podpisu sesji, minimum 32 znaki |
| `API_TOKEN` | generowane | Token API dla agentów, minimum 32 znaki |

Port wewnątrz kontenera pozostaje stały (`3000`). Dzięki temu zmiana portu na
hoście to jedna linia w `.env`, bez ruszania obrazu czy healthchecka.

Po zmianie konfiguracji odtwórz usługę:

```bash
docker compose up -d --build --force-recreate
```

## API dla agentów

Publikacja odbywa się przez `POST /api/v1/documents` z nagłówkiem:

```text
Authorization: Bearer TWOJ_TOKEN_API
```

Przy wywołaniu z katalogu instalacji możesz najpierw bezpiecznie wyeksportować
wartości z lokalnego pliku:

```bash
set -a
. ./.env
set +a
```

Markdown albo pojedynczy HTML można wysłać jako JSON:

```bash
curl -X POST http://szeruj.local:8369/api/v1/documents \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"markdown","title":"Raport agenta","content":"## Gotowe\n\nTreść raportu."}'
```

Plik `.md`, `.markdown`, `.html`, `.htm` albo `.zip` wyślesz jako formularz:

```bash
curl -X POST http://szeruj.local:8369/api/v1/documents \
  -H "Authorization: Bearer $API_TOKEN" \
  -F "title=Interaktywny raport" \
  -F "file=@./raport.zip"
```

Odpowiedź `201` zawiera obiekt `document` i gotowe pole `url`. Jego domena
pochodzi z `SZERUJ_PUBLIC_URL`, więc agent od razu oddaje właściwy link.

## Skill „Hej, szeruj”

W repozytorium jest przenośny skill w [`skills/szeruj`](skills/szeruj). Najprościej
poprosić Codex:

```text
Zainstaluj skill z https://github.com/marcin-kruszynski/szeruj/tree/main/skills/szeruj
```

Możesz też użyć systemowego instalatora skilli:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo marcin-kruszynski/szeruj \
  --path skills/szeruj
```

Następnie utwórz `~/.config/szeruj/config.env`:

```dotenv
SZERUJ_BASE_URL=http://szeruj.local:8369
SZERUJ_API_TOKEN=wklej_tutaj_wartosc_API_TOKEN_z_serwera
```

Od tej pory wystarczy powiedzieć „Hej, szeruj”. Agent przygotuje Markdown,
HTML albo ZIP, opublikuje go i odpowie:

```text
Hej, tutaj wrzuciłem <link>
```

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

Paczka ZIP może mieć najwyżej 15 MB, 50 MB po rozpakowaniu, 250 plików i 12 MB
na pojedynczy plik. Serwer odrzuca niebezpieczne ścieżki, duplikaty oraz ZIP-y
bez wejściowego HTML-u.

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

Jeżeli przechodzisz ze starego lokalnego magazynu Miniflare, jednorazowo użyj
`npm run data:migrate` przed wyłączeniem starej instalacji.

## Development

```bash
npm ci
npm run setup
npm run dev
```

Serwer deweloperski nasłuchuje na `0.0.0.0`; domyślnie otworzysz go pod
`http://localhost:3000`. Dane trafiają do `.szeruj-data/`.

Przed zmianą warto odpalić pełny zestaw kontroli:

```bash
npm run lint
npm test
```

Projekt zachowuje również wariant Cloudflare z D1 i R2:

```bash
npm run build:cloudflare
```

## Licencja

[MIT](LICENSE). Bierz, stawiaj u siebie i szeruj bez spiny.
