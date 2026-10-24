import { describe, expect, it } from 'vitest'
import { parseLine, type ParseContext } from '../src/shared/parser/patterns'
import { tokenize } from '../src/shared/parser/tokenize'
import type { ParsedEvent } from '../src/shared/parser/types'

/**
 * Project Morituri companions. Every line here was copied out of a real
 * eqlog_Teguus_morituri.txt: the companions never say "My leader is", so
 * before these rules every point of their damage was counted as a mob hitting
 * a mob, and the meter showed the caster commanding them doing nothing.
 */

function ctx(pinned: Record<string, string> = {}): ParseContext {
  return {
    self: 'Teguus',
    petOwners: new Map(Object.entries(pinned)),
    pinnedPets: new Set(Object.keys(pinned)),
    players: new Set(['Teguus'])
  }
}

function parse(body: string, c: ParseContext): ParsedEvent {
  const line = tokenize(`[Fri Oct 23 23:23:23 2026] ${body}`, 'Teguus', 0)
  expect(line, `tokenize failed for: ${body}`).not.toBeNull()
  return parseLine(line!, c)
}

describe('Morituri companions', () => {
  it('learns a companion from its "Attacking ... Master." tell', () => {
    const c = ctx()
    expect(parse("Rustik tells you, 'Attacking a flame lordling Master.'", c).kind).toBe('chat')

    const swing = parse('Rustik crushes a flame lordling for 376 points of damage.', c)
    expect(swing.attacker).toEqual({ name: 'Rustik', kind: 'pet', owner: 'Teguus' })
    expect(swing.amount).toBe(376)
  })

  it('learns a companion from its taunt line, which has no comma after says', () => {
    const c = ctx()
    parse("Rustik says 'Taunting attacker, Master.'", c)
    expect(c.petOwners.get('Rustik')).toBe('Teguus')
  })

  it('does not take ordinary chat for a companion', () => {
    const c = ctx()
    parse("Lurdrim tells you, 'Hello there.'", c)
    expect(c.petOwners.has('Lurdrim')).toBe(false)
  })

  it('reads the owner tag and strips it from the name', () => {
    const c = ctx()
    const hit = parse(
      'Rustik (Owner: Teguus) hit a flame lordling for 812 points of non-melee damage. (Valorous Strike)',
      c
    )
    expect(hit.kind).toBe('spell')
    expect(hit.attacker).toEqual({ name: 'Rustik', kind: 'pet', owner: 'Teguus' })
    expect(hit.skill).toBe('Valorous Strike')

    // And the tag is remembered, so plain melee lines land in the same row.
    const swing = parse('Rustik crushes a flame lordling for 376 points of damage.', c)
    expect(swing.attacker).toEqual({ name: 'Rustik', kind: 'pet', owner: 'Teguus' })
  })

  it('counts a hit on a companion as a hit on a pet, not on a mob', () => {
    const c = ctx()
    parse("Rustik tells you, 'Attacking a flame lordling Master.'", c)
    const taken = parse('A flame lordling hits Rustik for 262 points of damage.', c)
    expect(taken.target).toEqual({ name: 'Rustik', kind: 'pet', owner: 'Teguus' })
  })
})

describe('pets named in Preferences', () => {
  it('makes a name a pet before the log has said anything about it', () => {
    const c = ctx({ Twilightscar: 'Teguus' })
    const swing = parse('Twilightscar slashes a flame lordling for 290 points of damage.', c)
    expect(swing.attacker).toEqual({ name: 'Twilightscar', kind: 'pet', owner: 'Teguus' })
  })

  it('is never overruled by a log line', () => {
    const c = ctx({ Gark: 'Braxus' })
    parse("Gark says, 'My leader is Teguus.'", c)
    parse('Gark (Owner: Teguus) hit a gnoll for 10 points of non-melee damage.', c)
    expect(c.petOwners.get('Gark')).toBe('Braxus')
  })
})
