# Vlinderdagboek online zetten — stappenplan

Dit plan brengt je van deze map met bestanden naar een werkende website die
mensen op hun telefoon als app kunnen installeren. Je hebt **geen
programmeerkennis** nodig, alleen een computer en een uurtje tijd.
Alles in dit plan is **gratis**.

---

## Stap 1 — Maak twee accounts aan (10 min)

1. Ga naar **github.com** en klik op *Sign up*. GitHub is de plek waar de
   bestanden van je website komen te staan.
2. Ga naar **vercel.com** en klik op *Sign up*. Kies daar **"Continue with
   GitHub"** — zo zijn de twee accounts meteen aan elkaar gekoppeld.
   Vercel is de dienst die van je bestanden een echte website maakt.

## Stap 2 — Zet de bestanden op GitHub (15 min)

1. Log in op GitHub en klik rechtsboven op **+** → **New repository**.
2. Geef hem de naam `vlinderdagboek`, kies **Public**, en klik
   **Create repository**.
3. Op de pagina die verschijnt, klik je op de link **"uploading an existing
   file"**.
4. Pak de zip uit die je van Claude kreeg. Sleep nu **de inhoud van de map**
   (dus: `package.json`, `index.html`, `vite.config.js`, `.gitignore` en de
   mappen `src` en `public`) in het uploadvak.
   - Let op: sleep de bestanden en mappen zelf, niet de buitenste map.
5. Klik onderaan op **Commit changes**. Klaar — je code staat online.

## Stap 3 — Publiceer met Vercel (10 min)

1. Log in op vercel.com en klik op **Add New…** → **Project**.
2. Je ziet je `vlinderdagboek`-repository staan. Klik op **Import**.
3. Vercel herkent automatisch dat het een *Vite*-project is. Je hoeft niets
   aan te passen. Klik op **Deploy**.
4. Na 1–2 minuten zie je confetti 🎉 en een link zoals
   **vlinderdagboek.vercel.app**. Dat is je website — open hem op je
   telefoon en test!

## Stap 4 — Installeren als app op de telefoon

Dit werkt automatisch, omdat het project een zogenaamd PWA-manifest bevat:

- **Android (Chrome):** open de website → menu (⋮) → **App installeren**.
- **iPhone (Safari):** open de website → deelknop (vierkant met pijl) →
  **Zet op beginscherm**.

De app krijgt een eigen vlinder-icoon en opent zonder browserbalk, als een
echte app. Hij werkt zelfs offline.

## Stap 5 (optioneel) — Eigen domeinnaam

1. Koop een domeinnaam, bv. `vlinderdagboek.be`, bij een registrar zoals
   bv. Combell, Versio of one.com (± €15 per jaar).
2. In Vercel: open je project → **Settings** → **Domains** → vul je
   domeinnaam in en volg de instructies (je registrar legt uit waar je de
   getoonde gegevens invult).

---

## Goed om te weten

**Privacy (belangrijk!).** Alle dagboekgegevens worden uitsluitend
opgeslagen **op het toestel van de gebruiker zelf** (in de browser). Er is
geen server, geen database, geen account. Jij — of wie dan ook — kan de
gegevens van gebruikers niet zien. Dat is bewust zo gemaakt: zo voldoe je
vrijwel automatisch aan de AVG/GDPR. Zet wel een korte zin op de site of in
een privacyverklaring: *"Je gegevens blijven op je eigen toestel en worden
nergens naartoe gestuurd."*

Keerzijde: wist een gebruiker de browsergegevens of raakt de telefoon kwijt,
dan zijn de dagboekgegevens weg. Een export/back-upknop is een logische
volgende functie.

**Wijzigingen doorvoeren.** Pas je later iets aan (bv. een nieuw symptoom in
de lijst)? Bewerk het bestand `src/App.jsx` rechtstreeks op GitHub (potlood-
icoon) en klik *Commit changes*. Vercel publiceert de nieuwe versie binnen
twee minuten automatisch.

**Medische disclaimer.** De app toont al een zin dat hij geen medisch advies
vervangt. Laat die staan en wees terughoudend met medische claims op je
site — een dagboek mag, een behandeladvies niet.

**Hulp nodig?** Elke stap hierboven is een veelgestelde vraag; zoek bv. op
"vite project deployen vercel" en je vindt video's die het voordoen. Of
vraag het aan Claude met een schermafbeelding van waar je vastloopt.

Veel succes — en wat mooi dat je dit voor lotgenoten maakt. 🦋
