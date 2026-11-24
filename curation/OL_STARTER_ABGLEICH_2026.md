# Starting Offensive Line 2026 – Abgleich mit den offiziellen Starterlisten der Liga

Stand: 24.11.2026. Erzeugt aus `curation/ol_starters.json` (Skript `scripts/ol_starters.py`).

## Ergebnis in Kürze

- **15 von 15 Teams geprüft**, für alle 15 liegt eine vollständige offizielle Starterliste vor.
- **13 von 15 Starting Lines korrigiert**, insgesamt **24 O-Liner neu in der Starting Five**, 19 bisher angezeigte entfernt (Saarland hatte vorher fünf leere Plätze).
- **Seiten (LT/LG/RG/RT) sind für kein Team belegt.** Keine öffentliche Quelle nennt sie. Wo Starterliste oder Kader die Rolle
  angeben (Schwäbisch Hall: Tackle/Guard/Center; Berlin: OT/OG/Center), steht der Spieler auf dem passenden Platz – der Center in der
  Mitte, Tackles außen –, aber ohne Aussage über links/rechts. Die Website zeigt dafür „OL“, „OT“, „OG“ oder „C“, nie „LT“ o. ä.
- Die bisherige Logik (meiste Einträge im Statistikbogen, dann Kaderreihenfolge) hat bei fast jedem Team Spieler aufgestellt, die
  laut Liga nie oder selten gestartet sind – z. B. Ravensburg #55 Ben Schafheutle (0 Starts), Dresden #69 Deon Mutsvanemoto (0 Starts),
  Potsdam #69 Peer Schumann (wird in den Starterlisten als Defensive Lineman geführt).

## Methode

1. **Quelle:** Jede Spielseite auf statsnscore.online (`https://statsnscore.online/stats/v2/gamedata?gameid=…`) enthält den Abschnitt
   „Offense Starters“ je Team – erfasst von der Statistik-Crew am Spieltag. Das ist dieselbe Plattform, aus der alle Statistiken der
   Website stammen, und die Quelle, die z. B. der Wikipedia-Artikel „GFL Bowl 2026“ für seine Startaufstellung zitiert.
   Geladen wurden alle 97 GFL-Spiele 2026 (Regular Season und Playoffs); für 175 der 194 Team-Spiele gibt es eine Liste mit O-Linern.
2. **Starting Five = die fünf O-Liner des letzten Spiels mit vollständiger Liste** (möglichst aktuell). Zusätzlich je Spieler die Zahl
   seiner Starts in der Saison.
3. **Zuverlässigkeit:** *hoch* = im letzten Spiel Starter **und** in mindestens der Hälfte der Spiele mit Liste Starter;
   *mittel* = im letzten Spiel Starter, in der Saison aber seltener (später Wechsel oder Vertretung).
4. **Zuordnung zur Spieler-ID** nur über Team + Name (Nachname, dazu Vorname oder Rückennummer). Rückennummer laut offiziellem Kader.
   Spieler ohne eigenes Profil (stehen in keinem Statistikbogen) erscheinen mit Name und Nummer, ohne Profil-Link. Es wurden keine Spieler
   erfunden und keine IDs geändert.
5. **Ohne Starterliste bleibt ein Platz offen** – nie mit einem beliebigen Lineman aus dem Kader aufgefüllt.

### Weitere geprüfte Quellen

| Quelle | Ergebnis |
|---|---|
| statsnscore.online, Spielseiten „Offense Starters“ | **Verwendet.** Starter je Spiel und Team, Positionen meist nur „OL“ |
| [Wikipedia: GFL Bowl 2026](https://de.wikipedia.org/wiki/GFL_Bowl_2026), Abschnitt „Startaufstellung“ | Bestätigt die fünf OL von Dresden und Potsdam im GFL Bowl (gleiche Spieler, ohne Seiten) |
| stats.gfl.info (Archiv bis 2022) | keine Starter-Angaben, nur „Participation Report“; für 2026 nicht verfügbar |
| statsnscore-Rohdaten im Repository (`data/raw/statsnscore/<Saison>/`) | nur Statistikwerte, keine Starter- oder Positionsfelder |
| Vereinsseiten/Kader (z. B. potsdamroyals.de, dresden-monarchs.de, unicorns.de) | Kader mit Positionsgruppe, teils T/G/C (Unicorns), keine Starter, keine Seiten |
| Spielberichte (u. a. unicorns.de, potsdamroyals.de, ran.de, sachsen-fernsehen.de) | nennen die O-Line nur als Einheit („Burgess-Brüder“, „starke Blocks der O-Line“), keine Positionen |
| Instagram/Facebook der Teams | Spieltags- und Lineup-Grafiken sind für automatisierte Abrufe nicht zugänglich; nicht ausgewertet (siehe offene Punkte) |

## Gegenüberstellung je Team

### Allgäu Comets

Quelle: [Starterliste Regular 22.8.2026 gegen Düsseldorf Panther](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956e9227192b30414625) · Starterlisten für 7 von 12 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 56 | Anton Bruckmeier | – | 1/7 | 0 | mittel | ungeklärt | ja |
| 59 | Rudolf Zingel | – | 4/7 | 0 | hoch | ungeklärt | ja |
| 64 | Oliver Baumgardt | – | 7/7 | 0 | hoch | ungeklärt | ja |
| 68 | Daniel Schel | – | 6/7 | 0 | hoch | ungeklärt | ja |
| 69 | Oscar Zuddas (Starterliste: Nr. 76, Kader: Nr. 69 (angezeigt wird die Kadernummer)) | – | 2/7 | 0 | mittel | ungeklärt | **neu** |

Bisher angezeigt, jetzt entfernt: #77 Ehren Harvey (1 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #63 Matteo Acquadro (6, zuletzt 15.8.2026); #74 Dario Todisco (3, zuletzt 15.8.2026); #77 Marco Ücker (2, zuletzt 24.5.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 58, 63, 64, 68, 77 · letztes Hauptrundenspiel 22.8.2026: 56, 59, 64, 68, 76 · Playoffs: –

### Berlin Rebels

Quelle: [Starterliste Regular 6.9.2026 gegen Hildesheim Invaders](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956c9227192b304140d0) · Starterlisten für 10 von 12 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 66 | Robert Sövegjàrtô | Guard/Center (Starterliste) | 5/10 | 0 | hoch | ungeklärt | ja |
| 67 | Marcel Camenz | Center (Starterliste) | 8/10 | 0 | hoch | ungeklärt | **neu** |
| 71 | Gideon Grabert | Guard (Starterliste) | 4/10 | 0 | mittel | ungeklärt | ja |
| 72 | Sven Giesewatrowski | Tackle (Starterliste) | 9/10 | 0 | hoch | ungeklärt | ja |
| 73 | Sven Skora | Guard/Center (Starterliste) | 9/10 | 0 | hoch | ungeklärt | **neu** |

Bisher angezeigt, jetzt entfernt: #74 Matteo Lodovichi (5 Starts laut Liga); #78 Jannik Werblow (5 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #78 Jannik Werblow (5, zuletzt 29.8.2026); #74 Matteo Lodovichi (5, zuletzt 29.8.2026); #79 Raphael Miranda (3, zuletzt 6.6.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 67, 71, 72, 73, 79 · letztes Hauptrundenspiel 6.9.2026: 66, 67, 71, 72, 73 · Playoffs: –

### Braunschweig Lions

Quelle: [Starterliste Regular 15.8.2026 gegen Potsdam Royals](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956e9227192b304145d7) · Starterlisten für 12 von 12 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 57 | Jan-Mattes Selle | – | 12/12 | 0 | hoch | ungeklärt | ja |
| 60 | Dominik Bechler | – | 10/12 | 0 | hoch | ungeklärt | ja |
| 69 | Kevin De Oliveira Diogo | – | 9/12 | 0 | hoch | ungeklärt | ja |
| 75 | Marcos Munhoz ¹ | – | 6/12 | 0 | hoch | ungeklärt | **neu** |
| 79 | Nils Munderloh | – | 12/12 | 0 | hoch | ungeklärt | ja |

Bisher angezeigt, jetzt entfernt: #58 Lauritz Pohle (6 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #58 Lauritz Pohle (6, zuletzt 29.8.2026); #61 Duygu Ozkor (2, zuletzt 16.5.2026); #73 Sebastian Fischer (2, zuletzt 5.7.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 57, 58, 60, 61, 79 · letztes Hauptrundenspiel 29.8.2026: 57, 58, 69, 79 · Playoffs: –

### Dresden Monarchs

Quelle: [Starterliste Playoff 3.10.2026 gegen Potsdam Royals](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b304149a6) · Starterlisten für 15 von 15 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 59 | Johann Bachofner | – | 12/15 | 3 | hoch | ungeklärt | ja |
| 65 | Timo Wieczoreck | – | 14/15 | 3 | hoch | ungeklärt | ja |
| 75 | Phillip Most ¹ | – | 15/15 | 3 | hoch | ungeklärt | **neu** |
| 76 | Aaron Wahl | – | 15/15 | 3 | hoch | ungeklärt | ja |
| 79 | Daniel Szabo | – | 15/15 | 3 | hoch | ungeklärt | ja |

Bisher angezeigt, jetzt entfernt: #69 Deon Mutsvanemoto (0 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #53 Hermann Schramm (3, zuletzt 23.5.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 53, 65, 75, 76, 79 · letztes Hauptrundenspiel 30.8.2026: 59, 70, 75, 76, 79 · Playoffs: 12.9.2026: 59, 65, 75, 76, 79 · 19.9.2026: 59, 65, 75, 76, 79 · 3.10.2026: 59, 65, 75, 76, 79

### Düsseldorf Panther

Quelle: [Starterliste Playoff 12.9.2026 gegen Schwäbisch Hall Unicorns](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b304148e3) · Starterlisten für 12 von 13 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 62 | Emil Hagberg | – | 6/12 | 1 | hoch | ungeklärt | ja |
| 65 | Mikko Rajala | – | 12/12 | 1 | hoch | ungeklärt | **neu** |
| 71 | Dwain Njoh Mafany | – | 12/12 | 1 | hoch | ungeklärt | ja |
| 74 | Julius Frenken | – | 12/12 | 1 | hoch | ungeklärt | ja |
| 76 | Jakob Aaron Türk | – | 6/12 | 1 | hoch | ungeklärt | ja |

Bisher angezeigt, jetzt entfernt: #42 Jasper Lindqvist (0 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #52 Matej Bencek (4, zuletzt 13.6.2026); #77 Noah Ogiku (2, zuletzt 27.6.2026)

Saisonverlauf (Nummern): Saisonstart 16.5.2026: 52, 57, 71, 74 · letztes Hauptrundenspiel 29.8.2026: 62, 65, 71, 74, 76 · Playoffs: 12.9.2026: 62, 65, 71, 74, 76

### Hildesheim Invaders

Quelle: [Starterliste Playoff 12.9.2026 gegen Pforzheim Wilddogs](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b3041486e) · Starterlisten für 11 von 13 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 52 | Johan Sager | – | 7/11 | 1 | hoch | ungeklärt | ja |
| 57 | Otavio Amorim | – | 4/11 | 1 | mittel | ungeklärt | ja |
| 66 | Romeo Colin Amann | – | 7/11 | 1 | hoch | ungeklärt | ja |
| 70 | Maximilian Lemke | – | 4/11 | 1 | mittel | ungeklärt | ja |
| 73 | Paul Deuster | – | 4/11 | 1 | mittel | ungeklärt | **neu** |

Bisher angezeigt, jetzt entfernt: #76 Christian Wittler (10 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #76 Christian Wittler (10, zuletzt 22.8.2026); #74 David Beale (8, zuletzt 22.8.2026); #71 Daniel Kane (7, zuletzt 22.8.2026); #55 Lukas Macke (4, zuletzt 30.5.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 52, 55, 71, 74, 76 · letztes Hauptrundenspiel 22.8.2026: 57, 66, 71, 74, 76 · Playoffs: 12.9.2026: 52, 57, 66, 70, 73

### Kiel Baltic Hurricanes

Quelle: [Starterliste Regular 22.8.2026 gegen Potsdam Royals](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956e9227192b3041464c) · Starterlisten für 11 von 12 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 65 | Johannes Kurmis | – | 6/11 | 0 | hoch | ungeklärt | ja |
| 66 | Brereton Littlecott | – | 8/11 | 0 | hoch | ungeklärt | ja |
| 71 | Alexandre Mathieu | – | 5/11 | 0 | mittel | ungeklärt | ja |
| 76 | Ian Spitzke | – | 9/11 | 0 | hoch | ungeklärt | ja |
| 78 | Clemens Wolkenhaar | – | 10/11 | 0 | hoch | ungeklärt | ja |

Bisherige Zuordnung bestätigt (gleiche fünf Spieler).

Weitere Starter der Saison (nicht im letzten Spiel): #57 Mikkel Jacobsen (9, zuletzt 15.8.2026); #74 Felix Thomsen (3, zuletzt 13.6.2026); #64 Kevin von Kroge (2, zuletzt 23.5.2026)

Saisonverlauf (Nummern): Saisonstart 16.5.2026: 57, 64, 66, 71, 78 · letztes Hauptrundenspiel 22.8.2026: 65, 66, 71, 76, 78 · Playoffs: –

### Munich Cowboys

Quelle: [Starterliste Playoff 12.9.2026 gegen Dresden Monarchs](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b30414895) · Starterlisten für 13 von 13 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 52 | Florian Wenta | – | 13/13 | 1 | hoch | ungeklärt | ja |
| 56 | Maximilian Weegen | – | 12/13 | 1 | hoch | ungeklärt | ja |
| 62 | Noah Rimsky-Korsakow ¹ | – | 13/13 | 1 | hoch | ungeklärt | **neu** |
| 64 | Tobias Tüttinghoff | – | 4/13 | 1 | mittel | ungeklärt | ja |
| 70 | Christian Urban ¹ | – | 2/13 | 1 | mittel | ungeklärt | **neu** |

Bisher angezeigt, jetzt entfernt: #50 Kilian Feuerstein (10 Starts laut Liga); #66 Sandro Wohn (1 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #50 Kilian Feuerstein (10, zuletzt 22.8.2026); #74 Vincent Werfl (8, zuletzt 25.7.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 50, 52, 62, 64, 74 · letztes Hauptrundenspiel 29.8.2026: 52, 56, 62, 68, 70 · Playoffs: 12.9.2026: 52, 56, 62, 64, 70

### Pforzheim Wilddogs

Quelle: [Starterliste Playoff 19.9.2026 gegen Dresden Monarchs](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b30414931) · Starterlisten für 13 von 14 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 65 | Nico Friedrich | – | 7/13 | 2 | hoch | ungeklärt | **neu** |
| 68 | Tobias Pai | – | 12/13 | 2 | hoch | ungeklärt | **neu** |
| 72 | Joshua Sisifa | – | 9/13 | 2 | hoch | ungeklärt | ja |
| 73 | Xavier Venkataya | – | 13/13 | 2 | hoch | ungeklärt | ja |
| 79 | Pascal Osyguß | – | 6/13 | 1 | mittel | ungeklärt | **neu** |

Bisher angezeigt, jetzt entfernt: #78 Benhur Ayra (12 Starts laut Liga); #76 Björn Thilmann (0 Starts laut Liga); #64 Jan Schmid (6 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #78 Benhur Ayra (12, zuletzt 12.9.2026); #64 Jan Schmid (6, zuletzt 22.8.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 64, 65, 72, 73, 78 · letztes Hauptrundenspiel 22.8.2026: 64, 65, 68, 73, 78 · Playoffs: 12.9.2026: 65, 68, 72, 73, 78 · 19.9.2026: 65, 68, 72, 73, 79

### Potsdam Royals

Quelle: [Starterliste Playoff 3.10.2026 gegen Dresden Monarchs](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b304149a6) · Starterlisten für 14 von 15 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 51 | William Thursland | – | 14/14 | 3 | hoch | ungeklärt | ja |
| 54 | Benjamin Burghes | – | 13/14 | 2 | hoch | ungeklärt | **neu** |
| 68 | Joshua Rietveld | – | 11/14 | 3 | hoch | ungeklärt | **neu** |
| 70 | Nemanja Graovac | – | 7/14 | 1 | hoch | ungeklärt | ja |
| 74 | Louis Burghes | – | 13/14 | 3 | hoch | ungeklärt | ja |

Bisher angezeigt, jetzt entfernt: #69 Peer Schumann (0 Starts laut Liga); #58 Franz Legel (8 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #58 Franz-Legel (8, zuletzt 12.9.2026); #56 Ludwig-Rötzscher (3, zuletzt 19.9.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 51, 54, 58, 68, 75 · letztes Hauptrundenspiel 29.8.2026: 51, 54, 68, 70, 74 · Playoffs: 12.9.2026: 51, 56, 58, 68, 74 · 19.9.2026: 51, 54, 56, 68, 74 · 3.10.2026: 51, 54, 68, 70, 74

### Ravensburg Razorbacks

Quelle: [Starterliste Playoff 12.9.2026 gegen Potsdam Royals](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b304148bc) · Starterlisten für 12 von 13 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 54 | Lorenzo Gennaio Granato | – | 12/12 | 1 | hoch | ungeklärt | ja |
| 69 | Abdullah Orbay | – | 10/12 | 1 | hoch | ungeklärt | ja |
| 72 | Clemens Österle | – | 5/12 | 1 | mittel | ungeklärt | ja |
| 75 | Luca Nicklas ¹ | – | 9/12 | 1 | hoch | ungeklärt | **neu** |
| 78 | Aaron Wilmot | – | 12/12 | 1 | hoch | ungeklärt | ja |

Bisher angezeigt, jetzt entfernt: #55 Ben Schafheutle (0 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #52 Leon Hauber (7, zuletzt 19.7.2026); #65 Sebastian Trabold (4, zuletzt 30.8.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 54, 65, 69, 75, 78 · letztes Hauptrundenspiel 30.8.2026: 54, 65, 72, 75, 78 · Playoffs: 12.9.2026: 54, 69, 72, 75, 78

### Regensburg Phoenix

Quelle: [Starterliste Regular 29.8.2026 gegen Schwäbisch Hall Unicorns](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b304147ab) · Starterlisten für 10 von 12 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 60 | Marvin Benedict Biegert | – | 10/10 | 0 | hoch | ungeklärt | ja |
| 69 | Alexander Drexler | – | 9/10 | 0 | hoch | ungeklärt | ja |
| 71 | Ahmed Charfi | – | 5/10 | 0 | hoch | ungeklärt | ja |
| 76 | Benjamin Fuery | – | 2/10 | 0 | mittel | ungeklärt | ja |
| 77 | Jordan Orrini Taualii | – | 10/10 | 0 | hoch | ungeklärt | ja |

Bisherige Zuordnung bestätigt (gleiche fünf Spieler).

Weitere Starter der Saison (nicht im letzten Spiel): #70 Philip Weinzierl (7, zuletzt 15.8.2026); #65 Maximilian König (4, zuletzt 1.8.2026); #75 Enrico Bernock (2, zuletzt 4.7.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 60, 66, 69, 70, 77 · letztes Hauptrundenspiel 29.8.2026: 60, 69, 71, 76, 77 · Playoffs: –

### Saarland Hurricanes

Quelle: [Starterliste Regular 18.7.2026 gegen Munich Cowboys](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956d9227192b30414256) · Starterlisten für 11 von 12 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 55 | Francesco Runco | – | 5/11 | 0 | mittel | ungeklärt | **neu** |
| 56 | Marek Wolf ¹ (kein Kader hinterlegt und kein Spielerprofil gefunden - Name und Nummer laut Starterliste) | – | 11/11 | 0 | hoch | ungeklärt | **neu** |
| 59 | Leon Arend ¹ (kein Kader hinterlegt und kein Spielerprofil gefunden - Name und Nummer laut Starterliste) | – | 10/11 | 0 | hoch | ungeklärt | **neu** |
| 62 | Jeremy Berard | – | 5/11 | 0 | mittel | ungeklärt | **neu** |
| 79 | Jan Leiner | – | 11/11 | 0 | hoch | ungeklärt | **neu** |

Bisher: alle fünf Plätze leer (kein Kader hinterlegt).

Weitere Starter der Saison (nicht im letzten Spiel): #73 Ole Krebs (6, zuletzt 5.7.2026); #75 Marcel Höschele (3, zuletzt 30.5.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 56, 59, 73, 75, 79 · letztes Hauptrundenspiel 22.8.2026: 56, 59, 62, 79 · Playoffs: –

### Schwäbisch Hall Unicorns

Quelle: [Starterliste Playoff 19.9.2026 gegen Potsdam Royals](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956f9227192b3041490a) · Starterlisten für 13 von 14 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 51 | Alper Peközer | Guard (Starterliste) | 10/13 | 2 | hoch | ungeklärt | ja |
| 59 | Nick Gröne | Tackle (Starterliste) | 12/13 | 2 | hoch | ungeklärt | **neu** |
| 68 | Iseah Camara | Center (Starterliste) | 12/13 | 2 | hoch | ungeklärt | ja |
| 69 | Pascal Dürr | Guard (Starterliste) | 3/13 | 2 | mittel | ungeklärt | **neu** |
| 77 | Jakob Dusel | Guard (Starterliste) | 10/13 | 2 | hoch | ungeklärt | ja |

Bisher angezeigt, jetzt entfernt: #65 Manuel Jerichow (4 Starts laut Liga); #73 Marco Fischer (9 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #73 Marco Fischer (9, zuletzt 29.8.2026); #65 Manuel Jerichow (4, zuletzt 25.7.2026)

Saisonverlauf (Nummern): Saisonstart 9.5.2026: 51, 59, 68, 73, 77 · letztes Hauptrundenspiel 29.8.2026: 51, 59, 68, 73, 77 · Playoffs: 12.9.2026: 51, 59, 68, 69, 77 · 19.9.2026: 51, 59, 68, 69, 77

### Straubing Spiders

Quelle: [Starterliste Regular 29.8.2026 gegen Düsseldorf Panther](https://statsnscore.online/stats/v2/gamedata?gameid=69b6956e9227192b30414736) · Starterlisten für 9 von 12 Spielen

| Nr. | Spieler | Rolle (Quelle) | Starts 2026 | davon Playoffs | Zuverlässigkeit | Seite | bisher auf der Website |
|---|---|---|---|---|---|---|---|
| 52 | Finn Ludolph | – | 6/9 | 0 | hoch | ungeklärt | ja |
| 57 | Kai Kopecky | – | 7/9 | 0 | hoch | ungeklärt | ja |
| 58 | Nicolas Hofmeister ¹ | – | 7/9 | 0 | hoch | ungeklärt | **neu** |
| 71 | Philipp Pleischl | – | 8/9 | 0 | hoch | ungeklärt | ja |
| 76 | Florian Brandl ¹ | – | 3/9 | 0 | mittel | ungeklärt | **neu** |

Bisher angezeigt, jetzt entfernt: #77 Simon Eisenschink (3 Starts laut Liga); #53 Nico Hummel (0 Starts laut Liga)

Weitere Starter der Saison (nicht im letzten Spiel): #59 Jakob Wittmann (4, zuletzt 8.8.2026); #77 Simon Eisenschink (3, zuletzt 20.6.2026)

Saisonverlauf (Nummern): Saisonstart 23.5.2026: 57, 58, 70, 71, 77 · letztes Hauptrundenspiel 29.8.2026: 52, 57, 58, 71, 76 · Playoffs: –

¹ ohne eigenes Spielerprofil (steht in keinem Statistikbogen) – Name und Nummer laut Kader bzw. Starterliste.

## Offene Punkte

- **Seiten (LT/LG/C/RG/RT): für alle Teams ungeklärt.** Belastbar wären nur Angaben der Teams selbst (Depth Chart, Lineup-Grafik).
  Eintragen geht ohne Codeänderung: `slot` und `slotSource` je Spieler in `curation/ol_starters.json`, Team mit `"manual": true` schützen.
  Naheliegender erster Schritt: der Ravensburg-Spieler, der den Fehler gemeldet hat, bzw. die Teams direkt anfragen.
- **Center ohne Rollenangabe:** Nur Schwäbisch Hall (#68 Camara) und Berlin (#67 Camenz) haben einen ausdrücklich genannten Center.
  Dresden listet #59 Bachofner in 12 von 15 Spielen in der Mitte der Liste, Potsdam #51 Thursland – das ist ein Hinweis, kein Beleg,
  und wurde deshalb **nicht** übernommen.
- **Reihenfolge der Listen:** Bei Schwäbisch Hall ist sie räumlich (T–G–C–G–T), aber ob links oder rechts zuerst kommt, steht nirgends;
  bei anderen Teams (Ravensburg) ist sie nach Rückennummer sortiert. Sie wird nur bei angegebenen Rollen genutzt.
- **Kader-Abweichungen aus den Starterlisten:**
  - Allgäu: #69 Oscar Zuddas steht in den Starterlisten mit Nr. 71 bzw. 76; angezeigt wird die Kadernummer 69.
  - Ravensburg: #52 Leon Hauber startete 7 Spiele (zuletzt 19.7.2026), steht aber nicht im hinterlegten Vereinskader.
  - Berlin: #79 Raphael Miranda (3 Starts), Braunschweig: #61 Duygu Ozkor (2), Regensburg: #75 Enrico Bernock (2), Kiel: #64 Kevin von Kroge (2)
    starteten, stehen aber nicht im hinterlegten Kader – nicht in der aktuellen Starting Five, daher ohne Auswirkung.
  - Potsdam: #69 Peer Schumann ist im Kader als OL geführt, startet laut Liga aber als Defensive Lineman (u. a. GFL Bowl).
- **Saarland Hurricanes:** kein Vereinskader hinterlegt; Nummern stammen aus der Starterliste. #56 Marek Wolf und #59 Leon Arend haben kein Profil.
- **Braunschweig und Saarland:** Die letzte vollständige Liste ist nicht das letzte Spiel (dort weniger als fünf O-Liner erfasst).
- **Instagram/Facebook** konnten nicht automatisiert ausgewertet werden. Falls Teams dort Lineup-Grafiken mit Positionen veröffentlichen,
  wäre das die beste Quelle für die Seiten.

## Aktualisieren

```
python scripts/ol_starters.py fetch 2026   # Starterlisten neu laden
python scripts/ol_starters.py build 2026   # curation/ol_starters.json neu erzeugen (manual-Einträge bleiben)
cd web && npm run data                       # Website- und Trap-View-Daten
```
