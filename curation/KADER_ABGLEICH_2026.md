# Kader-Abgleich 2026 – Bericht

Stand 20.11.2026. Erzeugt beim Abgleich der offiziellen Kader mit den Spielern der Website. Daten: `curation/rosters.json` (Quelle der Wahrheit), angewendet durch `scripts/build_data.py`.

## Quellen je Team

| Team | Quelle | Einträge | mit Spieler-ID | OL (mit ID) | DL (mit ID) |
|---|---|---:|---:|---:|---:|
| Allgäu Comets | [Link](https://allgaeu-comets.de/team/gfl-roster/) · [Datei](https://allgaeu-comets.de/wp-content/uploads/2026/08/roster_gfl_2026_8b.xlsx) | 53 | 41 | 12 (6) | 8 (6) |
| Berlin Rebels | [Link](https://www.berlin-rebels.de/images/2026GFLRoster/Roster%20BRE%202026_download_082026_1.pdf) | 64 | 46 | 11 (7) | 13 (12) |
| Braunschweig Lions | [Link](https://braunschweig-lions.de/roster/) · [Datei](https://braunschweig-lions.de/wp-content/uploads/Braunschweig-Lions-Roster.xlsx) | 48 | 42 | 10 (5) | 7 (7) |
| Dresden Monarchs | [Link](https://www.dresden-monarchs.de/gfl-team/roster) | 74 | 63 | 12 (6) | 14 (13) |
| Düsseldorf Panther | [Link](https://duesseldorfpanther.de/gfl-team/roster/) | 65 | 57 | 12 (8) | 10 (10) |
| Hildesheim Invaders | [Link](https://goinvaders.de/list/invaders-2026-glf/) | 60 | 56 | 11 (8) | 10 (9) |
| Kiel Baltic Hurricanes | [Link](https://www.baltic-hurricanes.de/gfl/roster.html) | 56 | 48 | 9 (5) | 7 (7) |
| Munich Cowboys | [Link](https://www.munich-cowboys.de/gfl-roster/) · [Datei](https://www.munich-cowboys.de/wp-content/uploads/2026/09/MUNICH_COWBOYS_GFL_ROSTER_2026.xlsx) | 69 | 57 | 14 (5) | 12 (12) |
| Pforzheim Wilddogs | [Link](https://wilddogs.de/teams/seniors-i) | 59 | 46 | 12 (8) | 10 (7) |
| Potsdam Royals | [Link](https://www.potsdamroyals.de/gfl/roster-2026/) · [Datei](https://www.potsdamroyals.de/wp-content/uploads/2026/10/Roster_GFLBOWL2026_Potsdam_Royals.xlsx) | 63 | 54 | 14 (10) | 11 (9) |
| Ravensburg Razorbacks | [Link](https://ifm-razorbacks.de/team/ifm-razorbacks/roster/) | 54 | 40 | 9 (4) | 12 (9) |
| Regensburg Phoenix | [Link](https://www.regensburg-phoenix.com/wp-content/uploads/2026/05/Roster_2026.pdf) | 58 | 39 | 12 (6) | 7 (6) |
| Schwäbisch Hall Unicorns | [Link](https://unicorns.de/team/gfl-team/roster) | 87 | 66 | 18 (8) | 15 (15) |
| Straubing Spiders | [Link](https://straubing-spiders.de/mannschaft-srs/roster/) | 52 | 39 | 9 (4) | 8 (7) |
| **Summe** | | **862** | **694** | | |

Nicht berücksichtigt bzw. nicht verfügbar:
- **Saarland Hurricanes**: kein Link geliefert, Vereinsseite per Skript nicht abrufbar → kein Kader, Aufstellung bleibt „vorläufig“ ohne Nummern.
- **Krefeld Ravens** (krefeld-ravens.de): Team kommt in der GFL-Datenbank (2023–2026) nicht vor → nicht übernommen.
- **Hildesheim**: Der gelieferte Link `/invaders-2-0/roster/` ist der Kader der *zweiten Mannschaft* (Invaders II). Verwendet wurde der GFL-Kader `/list/invaders-2026-glf/`.
- **Schwäbisch Hall**: sport.de nennt nur Offense/Defense. Verwendet wurde der offizielle Kader von unicorns.de (mit Positionen); sport.de nur als Gegenprobe. Abweichung: #65 Manuel Jerichow – unicorns.de: Offensive Line, sport.de: Defense (übernommen: unicorns.de).
- **Ravensburg**: bereits am 12.11.2026 kuratiert; Vereinsseite am 20.11.2026 erneut geprüft – Nummern, Namen und Positionen unverändert.
- **Pforzheim**: Namen von der Vereinsseite; die Kader-Datei hat bei mehreren Spielern Vor-/Nachname vertauscht. Vereinsseite „Pascal WIld“ → „Pascal Wild“ (wie Kader-Datei).
- **Potsdam**: Spaltenköpfe Vor-/Nachname in der Datei vertauscht; **München**: Nr. 12 steht als „Kurok Jonas“ in vertauschten Spalten (übernommen als Jonas Kurok; nicht im Statistikbogen).

## Zuordnungsregeln

Team + Name (normalisiert: Umlaute/Akzente, Bindestriche, Groß-/Kleinschreibung, Namenszusätze), dann Zweitnamen („Marvin Benedict Biegert“ = „Marvin Biegert“), Tippfehler (≤ 2 Zeichen bei langen Namen), Nachname + Initiale („Joe“ = „Joseph“). Nie nur über die Rückennummer. Nur Spieler, die 2026 für dieses Team im Statistikbogen stehen. Jede Spieler-ID höchstens einmal je Kader. Von Hand bestätigt: Potsdam #51 William Thursland = „Billy Thursland“, Berlin #19 Tony Smith = „Antonio Smith“ (Kurzform, einziger Spieler dieses Nachnamens im Team).

## Namen nach offiziellem Kader (Spieler-ID unverändert)

- `leo-pierre-hernandez`: 'Léo-Pierre Hernandez' -> Léo Pierre Hernandez — Statistikbogen: 'Léo-Pierre Hernandez' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `kevin-de-oliveira-diogo`: 'Kevin De-Oliveira-Diogo' -> Kevin De Oliveira Diogo — Statistikbogen: 'Kevin De-Oliveira-Diogo' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `augustin-do-eyo`: 'Augustin Do-Eyo' -> Augustin Do Eyo — Statistikbogen: 'Augustin Do-Eyo' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `florian-zur-nieden`: 'Florian Zur-Nieden' -> Florian Zur Nieden — Statistikbogen: 'Florian Zur-Nieden' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `max-von-muhldorfer`: 'Max von-Mühldorfer' -> Max von Mühldorfer — Statistikbogen: 'Max von-Mühldorfer' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `dy-vonne-inyang`: "Dy'vonne Inyang" -> Dy’vonne Inyang — Statistikbogen: 'Dy'vonne Inyang' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `benewei-agwe-tayong`: 'Benewei-Agwe Tayong' -> Benewei Agwe Tayong — Statistikbogen: 'Benewei-Agwe Tayong' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `dwain-njoh-mafany`: 'Dwain-Njoh Mafany' -> Dwain Njoh Mafany — Statistikbogen: 'Dwain-Njoh Mafany' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `jakob-aaron-turk`: 'Jakob-Aaron Türk' -> Jakob Aaron Türk — Statistikbogen: 'Jakob-Aaron Türk' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `frank-haering`: 'Frank Haering' -> Frank Häring — Statistikbogen: 'Frank Haering' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `karm-garcia-hermann`: 'Karm Garcia-Hermann' -> Karm Garcia-Heermann — Statistikbogen: 'Garcia-Hermann'; offizieller Kader (PDF und Spielerseite): 'Garcia-Heermann'
- `jan-philipp-gultlingen`: 'Jan-Philipp Gültlingen' -> Jan-Philipp von Gültlingen — Statistikbogen ohne Namenszusatz 'von'
- `benajmin-o-gorman`: 'Benajmin O-Gorman' -> Benjamin O’Gorman — Statistikbogen: 'Benajmin O-Gorman' (Buchstabendreher, Apostroph fehlt)
- `junis-al-safadi`: 'Junis Al-Safadi' -> Junis Al Safadi — Statistikbogen: 'Junis Al-Safadi' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `haris-kovacevic`: 'Haris Kovacevic' -> Haris Kovačević — Statistikbogen: 'Haris Kovacevic' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `dazzani-matteo`: 'Dazzani Matteo' -> Matteo Dazzani — Statistikbogen: 'Dazzani Matteo' (Vor- und Nachname vertauscht)
- `manuel-moeller`: 'Manuel Moeller' -> Manuel Möller — Statistikbogen: 'Manuel Moeller' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `jacques-johan-fokapen-fokouen`: 'Jacques-Johan Fokapen-Fokouen' -> Jacques Johan Fokapen Fokouen — Statistikbogen: 'Jacques-Johan Fokapen-Fokouen' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `kristof-komiszar`: 'Kristof Komiszar' -> Kristóf Komiszár — Statistikbogen: 'Kristof Komiszar' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `hakki-demir-kaynakci`: 'Hakki-Demir Kaynakci' -> Hakki Demir Kaynakci — Statistikbogen: 'Hakki-Demir Kaynakci' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)
- `mike-dominik-latacz`: 'Mike-Dominik Latacz' -> Mike Dominik Latacz — Statistikbogen: 'Mike-Dominik Latacz' (Schreibweise: nur Bindestriche, Leerzeichen oder Groß-/Kleinschreibung abweichend)

Bewusst **nicht** geändert (Quellen widersprechen sich oder unklar): Julian Ludwig-Mayorga/„Ludwig Mayorga“ (SHU), Migel Vega-Amann (REG), Benjamin Fleury/„Fuery“ (REG), Willem Vancompernolle/„Vankompernolle“ (HIL), Nick Oliver/„Olivier“ (PFO, Vereinsseite und Datei uneinig), Bastian Schmidt (Kader-Datei: „Bastain“). Vornamen-Kurzformen (Josh/Joshua, Gabe/Gabriel …) bleiben wie im Statistikbogen.

## Unklare Fälle (nicht zugeordnet)

- Potsdam #8 **Hugh Harvey** (QB) vs. Statistik „Bay Harvey“ (QB, 6 Spiele): anderer Vorname → nicht verknüpft.
- Straubing #1 **David Perkins** (QB) vs. Statistik „Anthony-Eugene Perkins“ (QB, 3 Spiele): anderer Vorname → nicht verknüpft.
- Straubing #44 **Samuel Yates-McCabe** (LB) vs. Statistik „Samuel-James Yates“ (DEF, 5 Spiele): Nachname weicht ab → nicht verknüpft.
- Ravensburg #5 **Jack Enneking** (DL) vs. Statistik „John Enneking“: drei Ennekings im Team → bleibt wie bisher ohne ID.
- Hildesheim #82 Fabian Rolfes = Statistik „Fabian Rofles“ (2026, Hildesheim) verknüpft. Es gibt zusätzlich „Fabian Rolfes“ (Braunschweig 2023–2025) – vermutlich dieselbe Person, aber Teamwechsel nicht belegt → Profile nicht zusammengeführt, Anzeigename nicht angeglichen.

## Mögliche Doppel-Profile (nicht zusammengeführt)

Die Statistikbögen 2026 schreiben manche Spieler im Laufe der Saison unterschiedlich (z. B. voller Name statt Rufname). Der Kader nennt jeweils eine Person; verknüpft ist das Profil mit den meisten Spielen. Zusammenführen würde Statistiken verschieben und braucht deine Freigabe (Mechanismus: `curation/player_aliases.csv`, ändert aber die Spieler-ID).

- Straubing Spiders: `raleigh-benjamin-yeldell-iii` (verknüpft) ↔ `raleigh-yeldell`
- Straubing Spiders: `eloi-soler` (verknüpft) ↔ `eloi-soler-pintiado`
- Straubing Spiders: `onni-soininen` (verknüpft) ↔ `onni-ukko-soininen, onni-ukko-tapio-soininen`
- Straubing Spiders: `dane-lynch` (verknüpft) ↔ `dane-jason-lynch`
- Pforzheim Wilddogs: `michael-eksi` (verknüpft) ↔ `mika-eksi (2025)`

## Spieler mit Statistik 2026, aber nicht im offiziellen Kader

Meist Einzeleinsätze (Kader-Stand der Quelle, Nachverpflichtungen, Schreibweisen). Sie behalten Profil und Statistik, nur ohne Nummer.

- **Allgäu Comets** (3): Andrea Liffredi (2 Sp.), Krzysztof Spychala (4 Sp.), Simone Balzo (2 Sp.)
- **Berlin Rebels** (8): Alex Spillum (1 Sp.), Gianni Versace (1 Sp.), Lewis Kirby (1 Sp.), Lucas Schulz (1 Sp.), Marcel Behm (1 Sp.), Pascalis Dimeris (2 Sp.), Rudy Silvera (2 Sp.), Zamir Sadler (1 Sp.)
- **Braunschweig Lions** (5): Dominic Aboagye-Duah (3 Sp.), Duygu Ozkor (1 Sp.), Jamal Okeke (3 Sp.), Jeremy Sarfo (1 Sp.), Kevin Raab (1 Sp.)
- **Düsseldorf Panther** (5): Isaiah Weed (5 Sp.), Iseah Latuske (3 Sp.), Jon-Eric Zarius (1 Sp.), Lukas Dal Ben (2 Sp.), Mahsun Cakar (3 Sp.)
- **Kiel Baltic Hurricanes** (3): Joshua Köhnlein (8 Sp.), Thiago Lessow (5 Sp.), Tieu Long Otte (5 Sp.)
- **Munich Cowboys** (4): Christopher Herr (1 Sp.), Josef Jung (1 Sp.), Luis Maaßen (3 Sp.), Michael Bognar (2 Sp.)
- **Pforzheim Wilddogs** (1): Kerim Altunbas (1 Sp.)
- **Potsdam Royals** (7): Bay Harvey (6 Sp.), Charles Braun (1 Sp.), Giorgius Tarlas (11 Sp.), Glenn Devin-Knospe (4 Sp.), Joshua Shodipo (8 Sp.), Patrick Donahue (1 Sp.), Xeaiver Bullock (8 Sp.)
- **Ravensburg Razorbacks** (2): John Enneking (1 Sp.), Leon Hauber (2 Sp.)
- **Regensburg Phoenix** (7): Bendedikt Grünauer (1 Sp.), Daniel Breu (1 Sp.), Enrico Bernock (1 Sp.), Olivier Arbodian (3 Sp.), Severin Rüßmann (3 Sp.), Talveyion Cooper (5 Sp.), Tevita Lotoa (2 Sp.)
- **Straubing Spiders** (20): Anthony-Eugene Perkins (3 Sp.), Christopher Högerl (1 Sp.), Dane Jason Lynch (1 Sp.), Donovan-Eugene Lucas (1 Sp.), Edward-Jonathan Mangum (3 Sp.), Eloi Soler-Pintiado (1 Sp.), Fabian Suckert (2 Sp.), Gerald Raab (4 Sp.), Jarno Lipola (4 Sp.), Julian Reichert (2 Sp.), Kilian Aigner (2 Sp.), Lars Ludvig Widmark (3 Sp.), Martin Strohmayer (2 Sp.), Onni Ukko Soininen (1 Sp.), Onni Ukko Tapio Soininen (2 Sp.), Phillipp Willner (2 Sp.), Raleigh Yeldell (3 Sp.), Samuel-James Yates (5 Sp.), Stuart-Lewis Edwards (2 Sp.), Tobias Fischer (2 Sp.)

## Offensive Line in Aufstellung und Trap View

O-Liner stehen nur vereinzelt im Statistikbogen (Fumble-Recovery, Tackle nach Ballverlust, Strafe); die Einsatzschwelle (40 % der Spiele) erreicht praktisch keiner. Neue Regel: aufgestellt werden die OL laut Kader mit den meisten belegten Einsätzen (mind. einer). Das ist ausdrücklich keine Starter-Angabe. O-Liner ganz ohne Eintrag im Bogen haben kein Profil, stehen aber mit Name, Nummer und Position im Team-Kader der Teamseite.
