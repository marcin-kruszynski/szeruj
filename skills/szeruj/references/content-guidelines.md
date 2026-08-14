# Wytyczne dokumentów Szeruj

## Markdown

- Zapisuj UTF-8 i używaj GitHub Flavored Markdown.
- Nie powtarzaj mechanicznie tytułu jako H1; widok pokazuje tytuł nad treścią.
- Buduj wyraźną hierarchię nagłówków bez pomijania poziomów.
- Stosuj listy, checklisty, tabele i cytaty tam, gdzie ułatwiają skanowanie.
- Oznaczaj język bloków kodu, np. `bash`, `json`, `typescript` lub `plaintext`.
- Nie polegaj na surowym HTML-u w Markdownzie: renderer celowo go pomija.
- Dla interaktywnych wykresów lub diagramów wybierz HTML.

## Samodzielny HTML

- Utwórz kompletny dokument z `<!doctype html>`, `lang`, UTF-8 i responsywnym
  `meta viewport`.
- Zapewnij czytelność od 320 px, semantyczne nagłówki, widoczny fokus i dobry
  kontrast.
- Preferuj systemowe fonty i brak zewnętrznych zależności.
- Osadź małe dane oraz skrypty lokalnie. Przy danych pokaż datę, jednostki i
  źródło.
- Nie próbuj wychodzić z iframe ani sterować stroną nadrzędną.
- Dodaj komunikat zastępczy, gdy JavaScript jest wyłączony albo dane są puste.

## ZIP z witryną

- Umieść `index.html` w katalogu głównym.
- Używaj ścieżek względnych z `/`, np. `assets/chart.png`.
- Dodaj tylko pliki prezentacji. Pomiń źródła, cache, zależności, `.git`, `.env`,
  testy i konfigurację.
- Nie używaj dowiązań, ścieżek absolutnych, `..` ani backslashy.
- Sprawdź działanie po rozpakowaniu do pustego katalogu.

## Kontrola przed publikacją

1. Sprawdź tytuł i kompletność treści.
2. Usuń sekrety, dane osobowe i przypadkowe ścieżki lokalne.
3. Sprawdź linki, polecenia, liczby i daty.
4. Otwórz HTML lokalnie albo sprawdź składnię Markdownu.
5. Opublikuj dokładnie jeden finalny artefakt.
