---
name: szeruj
description: Twórz i publikuj gotowe do udostępnienia dokumenty Markdown, samodzielne strony HTML oraz paczki ZIP z HTML, CSS, JavaScriptem i zasobami w aplikacji Szeruj. Używaj zawsze, gdy użytkownik mówi „Szeruj”, „wrzuć do Szeruj”, „udostępnij przez Szeruj”, prosi o link do raportu lub chce opublikować wynik pracy agenta jako dokument.
---

# Szeruj

Przygotuj dokument z bieżącego kontekstu, opublikuj go przez chronione API
Szeruj i oddaj użytkownikowi gotowy publiczny link.

## Zachowaj kontrakt odpowiedzi

Po udanej publikacji zakończ odpowiedź dokładnie jedną krótką linią wypisaną
przez klienta. Klient losuje jeden z obsługiwanych komunikatów, na przykład:

- `Wyszerowane: <URL>`
- `Szernięte tu: <URL>`
- `Poszło w szer: <URL>`

Nie wymyślaj własnej wersji komunikatu i nie przepisuj go — zwróć dokładnie
linię z rzeczywistym adresem wypisaną przez `share.py`. Nie dodawaj logów,
instrukcji ani streszczenia, chyba że użytkownik wyraźnie o nie poprosi. Nigdy
nie twierdź, że dokument został opublikowany, jeśli API nie zwróciło poprawnego
adresu.

## Wykonaj przepływ publikacji

1. Ustal treść z bieżącej rozmowy.
   - Gdy „Szeruj” następuje po wykonanej analizie lub pracy, opublikuj jej
     najbardziej użyteczny rezultat bez ponownego pytania o treść.
   - Gdy użytkownik wskazuje plik, opublikuj dokładnie ten plik.
   - Gdy naprawdę nie ma materiału ani celu dokumentu, zadaj jedno krótkie
     pytanie doprecyzowujące i nie publikuj pustej strony.
2. Wybierz najprostszy właściwy format.
   - Markdown: raporty, instrukcje, notatki, zestawienia, plany i kod.
   - Pojedynczy HTML: dopracowany układ, wykres, diagram lub interakcja.
   - ZIP: wyłącznie gdy dokument potrzebuje wielu plików, obrazów, fontów,
     osobnego CSS-u albo JavaScriptu.
3. Nadaj konkretny tytuł. Nie używaj samotnych nazw „Dokument”, „Wynik” ani
   „Raport”.
4. Przygotuj kompletny artefakt i sprawdź go przed wysłaniem. Dla rozbudowanej
   treści przeczytaj [wytyczne dokumentów](references/content-guidelines.md).
   Dla nietypowej integracji albo błędu przeczytaj [referencję API](references/api.md).
5. Usuń dane, których użytkownik nie polecił publikować. Link jest nieindeksowany,
   ale publiczny dla każdego, kto go pozna. Nigdy nie publikuj tokenów, haseł,
   `.env`, cookies, kluczy prywatnych ani przypadkowo znalezionych sekretów.
6. Ustal katalog tego skilla na podstawie lokalizacji bieżącego `SKILL.md` i
   uruchom znajdujący się obok klient `scripts/share.py`. Nie zakładaj stałej
   ścieżki instalacji.

   Dla istniejącego pliku:

   ```bash
   python3 <katalog-skilla>/scripts/share.py \
     --file /bezwzgledna/sciezka/do/dokumentu.md \
     --title "Konkretny tytuł dokumentu"
   ```

   Dla treści przekazywanej standardowym wejściem:

   ```bash
   python3 <katalog-skilla>/scripts/share.py \
     --stdin --type markdown --title "Konkretny tytuł"
   ```

   Preferuj `--file`; zachowuje dokładną treść i unika problemów z cytowaniem.
   Klient sam odczytuje konfigurację, uwierzytelnia żądanie i sprawdza link.
7. Zwróć dokładnie linię wypisaną przez klienta. Jeśli klient zwróci błąd,
   zastosuj zasady poniżej zamiast wymyślać adres.

## Obchodź się z plikami świadomie

- Zachowaj istniejący plik użytkownika bez zmian, jeśli prosi tylko o publikację.
- Nie pakuj całego katalogu projektu. Do ZIP-a dodaj wyłącznie pliki potrzebne
  do dokumentu i umieść `index.html` w katalogu głównym.
- Nie dołączaj `node_modules`, `.git`, map źródeł, cache, `.env`, sekretów ani
  konfiguracji narzędzi.
- Preferuj samodzielny HTML, jeśli pozwala uniknąć ZIP-a bez utraty funkcji.
- Nie zakładaj dostępności zewnętrznych CDN-ów. Małe, niezbędne zasoby osadzaj
  lokalnie.

## Obsłuż błędy bez fałszywego sukcesu

- `400`: popraw dokument, UTF-8, tytuł albo strukturę ZIP-a i wyślij poprawiony
  artefakt najwyżej raz.
- `401`: nie wypisuj tokenu ani nie próbuj logowania do panelu. Poproś
  użytkownika, aby na swojej maszynie ponownie uruchomił konfigurator z
  `--configure --force`; token ma wkleić wyłącznie w ukrytym promptcie.
- `413`: zmniejsz dokument lub liczbę zasobów; nie obchodź limitów losowym
  dzieleniem publikacji.
- Brak połączenia: uruchom klienta z `--check`. Nie przełączaj samodzielnie celu
  na inną usługę.
- Niejednoznaczny timeout: nie ponawiaj publikacji w ciemno, bo API nie ma
  klucza idempotencji.
- Publikacja udana, kontrolne otwarcie nieudane: podaj otrzymany URL i krótko
  zaznacz brak potwierdzenia podglądu.

## Korzystaj z globalnej konfiguracji bez ujawniania sekretów

Konfiguracja jest globalna dla konta systemowego, więc działa w każdym projekcie
i w każdej nowej sesji agenta. Człowiek tworzy ją jednorazowo poleceniem:

```bash
python3 <katalog-skilla>/scripts/share.py \
  --configure --base-url http://adres-serwera:8369
```

Konfigurator pobiera token w ukrytym promptcie i zapisuje go poza projektami:

- Linux: `~/.config/szeruj/config.env`,
- macOS: `~/Library/Application Support/szeruj/config.env`,
- Windows: `%APPDATA%\szeruj\config.env`.

`XDG_CONFIG_HOME` i `SZERUJ_CONFIG_FILE` mogą zmienić lokalizację. Nigdy nie
proś użytkownika o wklejenie tokenu do czatu, treści dokumentu ani argumentu
polecenia. Gdy konfiguracji brakuje, podaj powyższe polecenie i poczekaj, aż
użytkownik sam wklei token w ukrytym promptcie.

Klient rozpoznaje też zmienne procesu `SZERUJ_BASE_URL`, `SZERUJ_PUBLIC_URL`,
`SZERUJ_API_TOKEN` i `API_TOKEN`. Jawny plik można wskazać przez
`--config-file`. Domyślny adres to `http://szeruj.local:8369`.

Sprawdź serwer bez publikowania:

```bash
python3 <katalog-skilla>/scripts/share.py --check
```

Uzyskaj maszynowy wynik podczas diagnozy:

```bash
python3 <katalog-skilla>/scripts/share.py \
  --file /bezwzgledna/sciezka/do/dokumentu.html --json
```
