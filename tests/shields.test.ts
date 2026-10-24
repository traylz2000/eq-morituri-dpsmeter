import { describe, expect, it } from 'vitest'
import { EncounterTracker } from '../src/shared/parser/encounter'
import { parseLine, type ParseContext } from '../src/shared/parser/patterns'
import { tokenize } from '../src/shared/parser/tokenize'
import type { ParsedEvent } from '../src/shared/parser/types'

/**
 * Damage shields. The lines are from a real eqlog_Teguus_morituri.txt: the
 * shield's non-melee line names no source, and the swing that follows names
 * who was wearing it.
 */

function ctx(): ParseContext {
  return {
    self: 'Teguus',
    petOwners: new Map([
      ['Rustik', 'Teguus'],
      ['Lurdrim', 'Teguus']
    ]),
    players: new Set(['Teguus'])
  }
}

function parseAll(lines: Array<[time: string, body: string]>): ParsedEvent[] {
  const c = ctx()
  return lines.map(([time, body], i) => {
    const line = tokenize(`[Fri Oct 23 ${time} 2026] ${body}`, 'Teguus', i)
    expect(line, `tokenize failed for: ${body}`).not.toBeNull()
    return parseLine(line!, c)
  })
}

function feed(events: ParsedEvent[]): ParsedEvent[] {
  return new EncounterTracker({ timeoutSeconds: 8 }).feed(events)
}

const shieldHit = (out: ParsedEvent[]): ParsedEvent =>
  out.find((e) => e.kind === 'spell' && e.amount === 198) as ParsedEvent

describe('damage shields', () => {
  it("credits the shield to whoever the mob was hitting - here, a pet", () => {
    const out = feed(
      parseAll([
        ['23:23:23', 'a flame lordling was hit by non-melee for 198 points of damage.'],
        ['23:23:23', 'A flame lordling was burned.'],
        ['23:23:23', 'A flame lordling hits Rustik for 88 points of damage.']
      ])
    )
    expect(shieldHit(out).attacker).toEqual({ name: 'Rustik', kind: 'pet', owner: 'Teguus' })
    expect(shieldHit(out).skill).toBe('Damage shield')
  })

  it('looks past a miss to the swing that landed', () => {
    const out = feed(
      parseAll([
        ['21:59:20', 'an obsidian tree spiderling was hit by non-melee for 198 points of damage.'],
        ['21:59:20', 'An obsidian tree spiderling tries to bite Lurdrim, but misses!'],
        ['21:59:20', 'An obsidian tree spiderling bites Lurdrim for 139 points of damage.']
      ])
    )
    expect(shieldHit(out).attacker?.name).toBe('Lurdrim')
  })

  /**
   * The case the old heuristic got wrong: a character had just begun a spell,
   * so it was handed the pet's shield damage.
   */
  it('beats the most-recent-cast guess', () => {
    const out = feed(
      parseAll([
        ['23:23:22', 'You begin casting Ethereal Light.'],
        ['23:23:23', 'a flame lordling was hit by non-melee for 198 points of damage.'],
        ['23:23:23', 'A flame lordling hits Rustik for 88 points of damage.']
      ])
    )
    expect(shieldHit(out).attacker?.name).toBe('Rustik')
  })

  it('leaves the line alone when no swing from that mob follows', () => {
    const out = feed(
      parseAll([
        ['23:23:23', 'a flame lordling was hit by non-melee for 198 points of damage.'],
        ['23:23:23', 'A jopal gatherer hits Rustik for 88 points of damage.']
      ])
    )
    expect(shieldHit(out).attacker).toBeUndefined()
  })

  it('does not reach across seconds', () => {
    const out = feed(
      parseAll([
        ['23:23:23', 'a flame lordling was hit by non-melee for 198 points of damage.'],
        ['23:23:30', 'A flame lordling hits Rustik for 88 points of damage.']
      ])
    )
    expect(shieldHit(out).attacker).toBeUndefined()
  })
})
