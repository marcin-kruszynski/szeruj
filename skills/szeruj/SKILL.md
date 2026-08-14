---
name: szeruj
description: Twórz i publikuj gotowe do udostępnienia dokumenty Markdown, samodzielne strony HTML oraz paczki ZIP z HTML, CSS, JavaScriptem i zasobami w aplikacji Szeruj. Używaj zawsze, gdy użytkownik mówi „Hej, szeruj”, „szeruj”, „wrzuć do Szeruj”, „udostępnij przez Szeruj”, prosi o link do raportu lub chce opublikować wynik pracy agenta jako dokument.
---

# Szeruj

Przygotuj dokument z bieżącego kontekstu, opublikuj go przez chronione API
Szeruj i oddaj użytkownikowi gotowy publiczny link.

## Zachowaj kontrakt odpowiedzi

Po udanej publikacji zakończ odpowiedź dokładnie jedną krótką linią:

```text
Hej, tutaj wrzuciłem <URL>
```

Podstaw rzeczywisty adres zwrócony przez API. Nie dodawaj logów, instrukcji ani
streszczenia, chyba że użytkownik wyraźnie o nie poprosi. Nigdy nie twierdź, że
dokument został opublikowany, jeśli API nie zwróciło poprawnego adresu.

## Wykonaj przepływ publikacji

1. Ustal treść z bieżącej rozmowy.
   - Gdy „Hej, szeruj” następuje po wykonanej analizie lub pracy, opublikuj jej
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
- `401`: nie wypisuj tokenu ani nie próbuj logowania do panelu. Zgłoś problem z
  konfiguracją tokenu.
- `413`: zmniejsz dokument lub liczbę zasobów; nie obchodź limitów losowym
  dzieleniem publikacji.
- Brak połączenia: uruchom klienta z `--check`. Nie przełączaj samodzielnie celu
  na inną usługę.
- Niejednoznaczny timeout: nie ponawiaj publikacji w ciemno, bo API nie ma
  klucza idempotencji.
- Publikacja udana, kontrolne otwarcie nieudane: podaj otrzymany URL i krótko
  zaznacz brak potwierdzenia podglądu.

## Korzystaj z konfiguracji bez ujawniania sekretów

Zalecana konfiguracja użytkownika to `~/.config/szeruj/config.env`:

```dotenv
SZERUJ_BASE_URL=http://szeruj.local:8369
SZERUJ_API_TOKEN=wklej_tutaj_token_serwera
```

Możesz też użyć zmiennych procesu albo `--env-file`. Klient rozpoznaje
`SZERUJ_BASE_URL`, `SZERUJ_PUBLIC_URL`, `SZERUJ_API_TOKEN` i serwerowe
`API_TOKEN`. Domyślny adres to `http://szeruj.local:8369`.

Sprawdź serwer bez publikowania:

```bash
python3 <katalog-skilla>/scripts/share.py --check
```

Uzyskaj maszynowy wynik podczas diagnozy:

```bash
python3 <katalog-skilla>/scripts/share.py \
  --file /bezwzgledna/sciezka/do/dokumentu.html --json
```
