# Morituri DPS Meter

A DPS meter and combat history for the **Project Morituri** EverQuest emulator
server. It reads the log files EverQuest already writes and turns them into a
live damage meter, a fight timeline and lifetime history, with your pets and
companions credited to you.

**It only reads your log.** Nothing is injected into EverQuest, no game file is
touched, no memory is read, and nothing is played for you. Turn logging off and
the app has nothing to show.

This is a fork of [Triune-Helper](https://github.com/tunaria/Triune-Helper),
retargeted from Project Triune to Project Morituri. See [PROJECT.md](PROJECT.md)
for what has changed and what is planned.

---

## Getting started

1. Install and run it. It is a per-user install, so there is no admin prompt.
2. In game, type `/log on` for each character you want to track.
3. Make sure hits are logged. Under **Options → Chat → Filters**, set your
   pet's hits, other players' hits, misses, damage shields and critical hits to
   show. With the defaults, most companion hits never reach the log and the
   meter has nothing to count.
4. In **Preferences**, point the app at your `Logs` folder if Auto-detect does
   not find it. It looks for `eqlog_<Character>_morituri.txt`.

Windows warns about an unrecognised app the first time you run the installer.
That is SmartScreen reacting to an unsigned binary, not a virus warning.

## Pets and companions

Companions on Morituri answer you as "Master" and tag their spell damage with
their owner (`Rustik (Owner: Teguus) hit …`). The meter reads both, so their
damage lands in your rows on its own.

If one is ever missed, or you want to be certain, name it under
**Preferences → Pets & companions**: type the name or pick it from the
dropdown, and choose which of your characters owns it. A pet named there is
always credited to that owner, whatever the log says.

## What it does

| Section | What you get |
|---|---|
| **Combat** | Live meter with per-skill breakdowns, a rolling DPS curve, damage by mob, procs, and the raw stream. A **Timeline** view puts one lane per skill so you can see misses as gaps. |
| **History** | Past fights, plus lifetime ledgers for **Zones**, **Mobs**, **Loot** and **Leveling**. **Rebuild from logs** in Preferences replays every `eqlog` on disk, so old logs count too. |
| **Alerts** | Rules over log lines with sounds and speech. |
| **Timers** | Countdowns you set, plus respawn windows worked out from gaps between your own kills. |
| **Overlays** | Always-on-top meter and stream windows. They open **locked** (click-through), so a stray click lands on the game. Overlays need borderless windowed mode, not exclusive fullscreen. |

**Leaderboards**, **Progression** and **Server** came from Triune-Helper and
read Project Triune's PTDex site. They do not apply to Morituri yet, and their
network lookups are off by default.

### Boxing several characters

Every client writes a log, and any line that isn't about *you* appears in all
of them. Each event is counted from exactly one log: your own swings from your
own log, your pet from its owner's log, and everything else from the log
nominated as **primary** in Preferences. The test suite checks that three logs
of one fight total exactly what one log of that fight totals.

## Development

Requires Node 22.

```bash
npm install
npm run dev        # app + hot reload
npm test           # vitest suites
npm run build      # typecheck + bundle
npm run package    # Windows installer -> release/<version>/
```

Find what the parser misses in a real log:

```bash
node scripts/unparsed.mjs "<path>\eqlog_<Char>_morituri.txt"
```

It ranks every line the parser ignores, commonest first.

Drive the UI without the game running:

```bash
node scripts/replay.mjs --out "C:\temp\Logs" --speed 4
```

Regenerate the app icon (add `--ozone-platform=headless` on a machine with no
display):

```bash
node scripts/make-icon.mjs
```

## Licence and credit

MIT. See [LICENSE](LICENSE). This project is built on
[Triune-Helper](https://github.com/tunaria/Triune-Helper), and its
copyright notice (Project Triune) is kept as the licence requires. The bundled data has its own
provenance, set out in [data/README.md](data/README.md).

EverQuest is a trademark of Daybreak Game Company LLC. This project is not
affiliated with or endorsed by them, or by Project Morituri.
