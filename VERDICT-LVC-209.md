# Verdict LVC-209 — FREIGABE

Gepruefte Spitze:

- elementeer (plugin): `7290655`
- elementeer-mcp: `9389cc2`
- version-sync.py, beide Repos: sha256 `9a589fe2c92ee4f8ddb055831e1db4a217c13ccf7c37fdf8c93350a5afbd34f6` (266 Zeilen, byte-identisch zur kanonischen)

Alle drei Unterkommandos wurden lokal gegen die neue Spitze ausgefuehrt, nicht gegen den ueberholten Stand. Exitcodes dokumentiert.

## Neue Pruefpunkte (nur diese drei)

### 1 — die drei Faelle (ausgefuehrt)

| Fall | elementeer | elementeer-mcp | Soll |
|------|-----------|----------------|------|
| a. Tag + Orte stimmen | `EXIT=0` | `EXIT=0` | 0 |
| b. ein Ort driftet | `EXIT=1` (const 2.3.1) | `EXIT=1` (capability.yaml 2.3.0) | != 0 |
| c. Orte stimmen, Tag passt nicht | `EXIT=1` (tag 2.5.0) | `EXIT=1` (tag 2.5.0) | != 0 |

Fall c ist der CAP-CI-001-Fall und ist der einzige, der durch `check-tag` neu abgedeckt wird.
`check_tag` fuehrt erst `check` (Orte untereinander), dann `source_of_truth == tag`.
Im Plugin greift `release.yml` mit `VERSION="${TAG#v}"` den v-Stripped-Wert an,
`check-tag "${VERSION}"` erhaelt also die bare Semver — korrekt.
Im MCP liest `release-check.sh` den Tag aus `GITHUB_REF` (`refs/tags/vX.Y.Z`),
strippt `v`, ruft `check-tag`, und nutzt danach `TAG="${PUSHED_TAG:-$TAG}"` fuer die Existenzpruefung.

Die Ops-Session-Aussage "Fall c gefahren" ist damit unabhaengig nachvollzogen.

### 2 — Tag-Schutz transitiv vollstaendig? JA

Altes release.yml verglich DREI Orte (Header, Const, readme) gegen den Tag.
Neu: `check` vergleicht jeden `required`-Ort gegen `source_of_truth`, `check_tag` vergleicht `source_of_truth` gegen den Tag.

Transitiv: alle Orte == sot UND sot == tag => alle Orte == tag. Kein Ort faellt aus.

Geprueft mit dem gefaehrlichsten Fork-Fall im Plugin: Header driftet (2.5.0),
Const + readme bleiben 2.4.0, Tag 2.4.0. `EXIT=1`, weil `check` die Const/readme
gegen den gedrifteten sot (Header) als MISMATCH meldet. Der doppelt besetzte Pfad
`elementeer.php` (Header-Sot + Const-Ort) ist in der Praxis robust, weil jedes
`required`-Location unabhaengig gegen den sot-Wert verglichen wird — kein false-green.

Abdeckung ist strikt staerker als alt: eine kuenftige neue `required`-Location
waere automatisch mitgeprueft, was das alte 3-Wege-grep nicht getan haette.

### 3 — die drei Zusatzauflagen: Folge-Ticket, kein Blocker

- Drift-Aussage zu den drei Kopien: **noch offen.** Kein Abgleich-Mechanismus. Heute
  byte-identisch (sha oben, selbst gemessen). Kein Merge-Blocker, aber Folge-Ticket.
- toter `scripts/release-check.sh` im Plugin: **bestaetigt, weiter tot.** Kein Workflow
  ruft ihn auf, er grept auf `package.json`/`capability.yaml`, die es im Plugin nicht
  gibt. Kein Merge-Blocker, aber aufraeumen.
- `package-lock.json`-Ausnahme dokumentieren: **noch offen.** Der Root-Lock traegt die
  `version 2.4.2`, ist in `.version.yaml` weder deklariert noch explizit begruendet
  ausgenommen. Kein Merge-Blocker, aber eine Zeile doku.

Alle drei gehen als Folge-Ticket. Sie heben nicht an der Kernfrage des Tickets
(eine Wahrheit, zwei Leser); die ist mit `check-tag` + dem migrierten release.yml
jetzt gehalten.

## Verdict

FREIGABE. Merge nach dev, nicht nach main.

Kein Merge, kein Self-Approval — hier nur Review.
