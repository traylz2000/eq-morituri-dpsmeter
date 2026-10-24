# eq-morituri-dpsmeter

A DPS meter and combat history for the **Project Morituri** EverQuest emulator
server, forked from [tunaria/Triune-Helper](https://github.com/tunaria/Triune-Helper)
(MIT). Like the original, it only reads the log files EverQuest writes — no
injection, no memory reads, nothing written near the game folder.

- Repo: https://github.com/traylz2000/eq-morituri-dpsmeter
- Upstream: https://github.com/tunaria/Triune-Helper (remote `upstream`)
- Target platform: **Windows** (players run the game on Windows). Development
  also happens on Linux.

## Goals

1. **DPS meter** — accurate live damage for the player, their companions, and
   group members.
2. **History** — fights and per-zone/per-mob lifetime ledgers kept across
   sessions.
3. Other upstream features (alerts, timers, loot, leveling) stay in if they
   work on Morituri, and come out if they do not.

## Morituri vs. Triune — what differs

| | Triune (upstream) | Morituri |
|---|---|---|
| Log filename | `eqlog_<Char>_multiclass.txt` | `eqlog_<Char>_morituri.txt` |
| Install paths | `C:\ProjectTriune`, `C:\Triune`, … | Guessed: `C:\Morituri`, `C:\ProjectMorituri`, … (unconfirmed) |
| Leaderboards / progression | Scraped from PTDex | No PTDex — pages hidden |
| Companions | — | Players command companions (`#petcmd attack all`); companions answer "Attacking X Master." |

## Log findings (sample: Plane of Fire, 2026-10-23, ~26k lines)

- The parser reads the server's message formats. It handles 12.4k lines;
  nearly all of the rest are chat, `#petcmd`, flavor text ("was burned",
  "beams a smile", "FLURRY") and autosell messages.
- Incoming melee, non-melee/damage-shield hits, deaths, coin, zoning and
  resists all parse.
- With the default chat filters, **companion hits were almost entirely
  missing**: only killing blows and `scores a critical hit! (N)` lines
  appeared. With the hit filters changed in game, a new sample log
  (2026-10-23 23:23) confirms the hits now appear.
- Companions never say "My leader is …". Ownership comes from their
  "Attacking X Master." / "Taunting attacker, Master." lines and the
  `Name (Owner: X) hit …` tag on their spell damage. Without those rules,
  ~213k of 3 minutes' companion damage was counted as mob-on-mob.
- ~15k of that sample is untargeted "was hit by non-melee" (damage shields).
  Each one is followed within three lines by the mob's swing at the shield's
  owner, which is how they are now credited.
- Example group in the sample: Teguus (log owner, caster), companions Rustik,
  Lurdrim, Twilightscar; the group also had another player, a bard, who is not a pet.

## Plan

- [x] Re-check the parser against a log captured with hit filters enabled
- [x] Server shortname `multiclass` → `morituri`; guessed Morituri install paths (confirm the real one)
- [x] Attribute companion damage to the owning player (auto-detected from log lines)
- [x] Preferences › Pets & companions: name pets by hand (typed or picked from
      detected names) and choose the owner; overrides the log
- [x] Credit damage-shield hits ("was hit by non-melee" + "X was burned") to the
      shield's owner (the target of the mob's next swing) instead of the most recent caster
- [x] Rebrand: "Morituri DPS Meter" name, appId, window titles, installer, README, new icon
      (the inherited Project Triune emblem was replaced)
- [x] Updater points at this repo (it has no releases yet, so a check reports that)
- [x] Morituri look: default colour scheme from project-morituri.com's palette, bundled
      Cinzel / Archivo / JetBrains Mono, bronze-and-oxblood emblem and icon. The
      server's shield logo is NOT used. Ask the Morituri admins before adding it.
- [x] Hide Triune-only pages: Leaderboards and Progression (PTDex), plus Overview's flag panel and the
      party refresh button when no PTDex address is set. Server stays: it is built from log broadcasts,
      not PTDex
- [ ] Update outdated Electron / electron-builder (npm audit: 28 issues)
- [x] Windows installer build: GitHub Actions (`.github/workflows/windows-installer.yml`)

## Releasing

1. Bump the version: `npm version 0.2.1 --no-git-tag-version`, then commit.
2. Tag and push: `git tag v0.2.1 && git push origin main v0.2.1`.
3. The **Windows installer** workflow tests, builds and attaches
   `Morituri-DPS-Meter-Setup-<version>.exe` (plus `latest.yml` and the
   blockmap) to a GitHub release for that tag.

For a test build without a release: Actions tab, **Windows installer**,
**Run workflow**. The installer is attached to the run as an artifact.

## Development

Requires Node 22.

```bash
npm ci
npm test           # vitest suites
npm run typecheck
npm run dev        # app with hot reload
npm run package    # Windows installer -> release/<version>/
node scripts/unparsed.mjs testdata/eqlog_<Char>_morituri.txt   # lines the parser ignores
```

Sample logs go in `testdata/`, which is gitignored: logs contain other players'
chat and must not be committed.
